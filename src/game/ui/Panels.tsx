import { Box, Braces, Building2, Code, FlaskConical, House, ListTree, Play, Route, Save, Shrub, Square, Sword, Terminal, TreeDeciduous, User } from "lucide-react";
import { useMemo, type ComponentType } from "react";
import { toast } from "sonner";
import { StudioButton } from "@/components/studio/StudioButton";
import { cn } from "@/lib/utils";
import { displayNames } from "../catalog";
import { useStudio } from "../store";
import type { ObjKind } from "../types";

const STORE: Array<{ kind: ObjKind; label: string; hint: string; Icon: ComponentType<{ className?: string }> }> = [
  { kind: "tree", label: "Cây táo", hint: "Cây xanh, quả đỏ", Icon: TreeDeciduous },
  { kind: "house", label: "Nhà", hint: "Nhà có mái", Icon: House },
  { kind: "road", label: "Đường", hint: "Đoạn đường xám", Icon: Route },
  { kind: "bush", label: "Bụi cây", hint: "Cụm lá thấp", Icon: Shrub },
  { kind: "sword", label: "Kiếm", hint: "10 dame", Icon: Sword },
  { kind: "house2", label: "Nhà 2 tầng", hint: "Nhà cao có 2 tầng", Icon: Building2 },
  { kind: "potion", label: "Bình thuốc", hint: "Uống: +5 tốc độ", Icon: FlaskConical },
];

export function ModelStore() {
  const spawn = useStudio((s) => s.spawn);
  const playing = useStudio((s) => s.mode === "play");
  return (
    <aside className="flex w-[clamp(8.5rem,15vw,13rem)] shrink-0 flex-col overflow-hidden border-r border-border bg-panel">
      <div className="panel-title">Model Free</div>
      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-2">
        {STORE.map(({ kind, label, hint, Icon }) => (
          <button
            key={kind}
            type="button"
            disabled={playing}
            onClick={() => spawn(kind)}
            className="group flex items-center gap-2.5 rounded-lg border border-border bg-secondary p-2 text-left transition-colors hover:border-primary hover:bg-accent active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-muted text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{label}</span>
              <span className="hidden truncate text-[11px] text-muted-foreground lg:block">{hint}</span>
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}

const BTN = "max-lg:h-8 max-lg:gap-1.5 max-lg:px-2 max-lg:text-xs";

export function ControlPanel({ onCode, onCodeGame }: { onCode: () => void; onCodeGame: () => void }) {
  const mode = useStudio((s) => s.mode);
  const play = useStudio((s) => s.play);
  const stop = useStudio((s) => s.stop);
  const save = useStudio((s) => s.save);
  const spawn = useStudio((s) => s.spawn);
  const select = useStudio((s) => s.select);
  const selectedId = useStudio((s) => s.selectedId);
  const objects = useStudio((s) => s.project?.objects);
  const names = useMemo(() => displayNames(objects ?? []), [objects]);
  const playing = mode === "play";

  return (
    <aside className="flex w-[clamp(8.5rem,15vw,13rem)] shrink-0 flex-col overflow-hidden border-l border-border bg-panel">
      <div className="panel-title">Điều khiển</div>
      <div className="grid gap-1.5 p-2">
        {playing ? (
          <StudioButton variant="stop" block className={BTN} onClick={stop}>
            <Square className="h-4 w-4 fill-current" /> Stop
          </StudioButton>
        ) : (
          <StudioButton variant="play" block className={BTN} onClick={play}>
            <Play className="h-4 w-4 fill-current" /> Play
          </StudioButton>
        )}
        <StudioButton
          block
          className={BTN}
          disabled={playing}
          onClick={() => {
            save();
            toast.success("Đã lưu dự án");
          }}
        >
          <Save className="h-4 w-4" /> Lưu
        </StudioButton>
        <StudioButton block className={BTN} disabled={playing} onClick={() => spawn("part")}>
          <Box className="h-4 w-4" /> Tạo Part
        </StudioButton>
        <StudioButton block className={BTN} disabled={playing} onClick={onCode}>
          <Code className="h-4 w-4" /> Code
        </StudioButton>
        <StudioButton block className={BTN} disabled={playing} onClick={onCodeGame}>
          <Terminal className="h-4 w-4" /> Code Game
        </StudioButton>
      </div>
      <div className="panel-title border-t">
        <ListTree className="h-3.5 w-3.5" /> Explorer
      </div>
      <ul className="flex-1 overflow-y-auto p-1.5 text-xs">
        <li className="flex items-center gap-2 rounded px-2 py-1.5 text-muted-foreground">
          <User className="h-3.5 w-3.5 shrink-0 text-warning" />
          <span className="truncate">Người chơi · 100 máu</span>
        </li>
        {(objects ?? []).map((o) => (
          <li key={o.id}>
            <button
              type="button"
              disabled={playing}
              onClick={() => select(o.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-accent disabled:opacity-60",
                selectedId === o.id && "bg-primary text-primary-foreground hover:bg-primary",
              )}
            >
              <Braces className="h-3.5 w-3.5 shrink-0 opacity-60" />
              <span className="truncate">{names.get(o.id)}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
