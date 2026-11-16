import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronsDown, ChevronsUp, FlaskConical, Footprints, Hand, Heart, MoveUp, Smartphone, Swords } from "lucide-react";
import { useRef, useState, type ComponentType, type PointerEvent } from "react";
import { StudioButton } from "@/components/studio/StudioButton";
import { input, runtime } from "../runtime";
import { canSwing, drinkPotion, dropItem, heldSword, jump, playersInReach, swing } from "../sim/play";
import { pvp, remotes } from "../multiplayer";
import { useStudio } from "../store";
import { lockLandscape } from "../orientation";

type NavKey = keyof typeof input.nav;

function NavButton({ k, label, Icon }: { k: NavKey; label: string; Icon: ComponentType<{ className?: string }> }) {
  const on = (v: number) => (e: PointerEvent<HTMLButtonElement>) => {
    if (v) e.currentTarget.setPointerCapture(e.pointerId);
    input.nav[k] = v;
  };
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={on(1)}
      onPointerUp={on(0)}
      onPointerCancel={on(0)}
      onLostPointerCapture={on(0)}
      className="flex h-11 w-11 touch-none select-none flex-col items-center justify-center rounded-lg border border-border bg-overlay text-[9px] font-medium leading-tight text-foreground backdrop-blur-md transition-colors hover:bg-accent active:bg-primary active:text-primary-foreground"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

/** Camera navigation pad for edit mode (hold to move). */
export function NavPad() {
  return (
    <div className="pointer-events-auto absolute bottom-3 left-3 flex items-end gap-2">
      <div className="grid grid-cols-3 gap-1">
        <span />
        <NavButton k="fwd" label="Tiến" Icon={ArrowUp} />
        <span />
        <NavButton k="left" label="Trái" Icon={ArrowLeft} />
        <NavButton k="back" label="Lùi" Icon={ArrowDown} />
        <NavButton k="right" label="Phải" Icon={ArrowRight} />
      </div>
      <div className="grid gap-1">
        <NavButton k="up" label="Lên" Icon={ChevronsUp} />
        <NavButton k="down" label="Xuống" Icon={ChevronsDown} />
      </div>
    </div>
  );
}

/** Virtual joystick: writes a -1..1 vector (y = forward) to input.joy. */
export function Joystick() {
  const base = useRef<HTMLDivElement>(null);
  const active = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const move = (e: PointerEvent) => {
    const el = base.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const rad = r.width / 2;
    let dx = e.clientX - (r.left + rad);
    let dy = e.clientY - (r.top + rad);
    const len = Math.hypot(dx, dy);
    if (len > rad) {
      dx = (dx / len) * rad;
      dy = (dy / len) * rad;
    }
    input.joy.x = dx / rad;
    input.joy.y = -dy / rad;
    setKnob({ x: dx, y: dy });
  };
  const end = () => {
    active.current = null;
    input.joy.x = 0;
    input.joy.y = 0;
    setKnob({ x: 0, y: 0 });
  };
  return (
    <div
      ref={base}
      className="pointer-events-auto absolute bottom-4 left-4 h-32 w-32 touch-none select-none rounded-full border border-border bg-overlay backdrop-blur-md"
      onPointerDown={(e) => {
        active.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={(e) => e.pointerId === active.current && move(e)}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div
        className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full bg-primary shadow-glow"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
    </div>
  );
}

export function doSwing() {
  const rt = runtime.current;
  if (!rt) return;
  const ok = canSwing(rt);
  const damage = heldSword(rt)?.damage ?? 0;
  swing(rt);
  // Other players in a play-together room take the hit on their own device.
  if (ok) for (const id of playersInReach(rt, [...remotes.values()])) pvp.hit(id, damage);
}

export function doDrop() {
  if (runtime.current && dropItem(runtime.current)) useStudio.getState().setHud({ holding: null });
}

export function doJump() {
  if (runtime.current) jump(runtime.current);
}

export function doDrink() {
  const rt = runtime.current;
  if (rt && drinkPotion(rt)) useStudio.getState().setHud({ holding: null, speed: rt.player.speed });
}

export function PlayHud() {
  const hud = useStudio((s) => s.hud);
  const pct = Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100));
  return (
    <>
      <div className="pointer-events-none absolute left-1/2 top-3 w-[min(18rem,60%)] -translate-x-1/2 rounded-lg border border-border bg-overlay p-2 backdrop-blur-md">
        <div className="mb-1 flex items-center justify-between text-xs font-semibold">
          <span className="flex items-center gap-1.5">
            <Heart className="h-3.5 w-3.5 fill-destructive text-destructive" /> Máu
          </span>
          <span className="tabular-nums">
            {hud.hp} / {hud.maxHp}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-hp-track">
          <div className="h-full rounded-full bg-hp transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1.5 flex items-center justify-center gap-1 text-center text-[11px] text-muted-foreground">
          <Footprints className="h-3 w-3" /> Tốc độ {hud.speed}
          {hud.holding === "sword" && <> · Đang cầm kiếm · {hud.damage} dame</>}
          {hud.holding === "potion" && <> · Đang cầm bình thuốc</>}
        </p>
      </div>
      <p className="pointer-events-none absolute left-3 top-3 hidden rounded-md bg-overlay px-2 py-1 text-[11px] text-muted-foreground backdrop-blur-md xl:block">
        WASD / joystick để đi · Space nhảy · J chém · E uống · Q thả
      </p>
      <Joystick />
      {!hud.dead && (
        <div className="pointer-events-auto absolute bottom-5 right-4 flex items-end gap-3">
          {hud.holding && (
            <StudioButton variant="action" size="round" onClick={doDrop}>
              <span className="flex flex-col items-center gap-0.5">
                <Hand className="h-5 w-5" /> Thả
              </span>
            </StudioButton>
          )}
          {hud.holding === "potion" && (
            <StudioButton variant="action" size="round" onClick={doDrink}>
              <span className="flex flex-col items-center gap-0.5">
                <FlaskConical className="h-5 w-5" /> Uống
              </span>
            </StudioButton>
          )}
          {hud.holding === "sword" && (
            <StudioButton variant="primary" size="round" className="h-20 w-20 rounded-full" onPointerDown={doSwing}>
              <span className="flex flex-col items-center gap-0.5">
                <Swords className="h-6 w-6" /> Chém
              </span>
            </StudioButton>
          )}
          <StudioButton variant="play" size="round" className="h-20 w-20 rounded-full" onPointerDown={doJump}>
            <span className="flex flex-col items-center gap-0.5">
              <MoveUp className="h-6 w-6" /> Nhảy
            </span>
          </StudioButton>
        </div>
      )}
      {hud.dead && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-overlay">
          <div className="text-center animate-float-in">
            <p className="text-3xl font-extrabold text-destructive">Bạn đã gục!</p>
            <p className="mt-1 text-sm text-muted-foreground">Bấm Stop để quay lại chỉnh sửa.</p>
          </div>
        </div>
      )}
    </>
  );
}

export function RotateHint() {
  const [dismissed, setDismissed] = useState(false);
  const [failed, setFailed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="rotate-hint fixed inset-0 z-[60] flex-col items-center justify-center gap-5 bg-background p-8 text-center">
      <Smartphone className="h-14 w-14 text-primary animate-rotate-phone" />
      <div>
        <p className="text-lg font-bold">Xoay ngang thiết bị</p>
        <p className="mt-1 text-sm text-muted-foreground">Bờm Studio được thiết kế cho màn hình ngang.</p>
      </div>
      <StudioButton
        variant="primary"
        size="lg"
        onClick={async () => {
          if (!(await lockLandscape())) setFailed(true);
        }}
      >
        Xoay ngang tự động
      </StudioButton>
      {failed && <p className="max-w-xs text-xs text-muted-foreground">Trình duyệt này không cho tự xoay. Hãy bật xoay màn hình và xoay ngang điện thoại.</p>}
      <StudioButton variant="ghost" onClick={() => setDismissed(true)}>
        Vẫn tiếp tục ở màn hình dọc
      </StudioButton>
    </div>
  );
}
