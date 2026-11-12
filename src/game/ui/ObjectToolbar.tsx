import { Html } from "@react-three/drei";
import { Maximize2, Move3d, Palette, Trash2, X } from "lucide-react";
import { useState, type SyntheticEvent } from "react";
import * as THREE from "three";
import { StudioButton } from "@/components/studio/StudioButton";
import { PART_COLORS } from "../catalog";
import { useStudio } from "../store";
import type { GameObject } from "../types";

const stop = (e: SyntheticEvent) => e.stopPropagation();
const P = new THREE.Vector3();

/** Projects like drei's default, then keeps the toolbar inside the viewport. */
function clampedPosition(el: THREE.Object3D, camera: THREE.Camera, size: { width: number; height: number }) {
  P.setFromMatrixPosition(el.matrixWorld).project(camera);
  const half = Math.min(size.width / 2, 210);
  const x = Math.max(half, Math.min(size.width - half, (P.x * 0.5 + 0.5) * size.width));
  const y = Math.max(64, Math.min(size.height - 8, (-P.y * 0.5 + 0.5) * size.height));
  return [x, y];
}

/** Floating toolbar shown above the selected object. */
export function ObjectToolbar({ obj, y }: { obj: GameObject; y: number }) {
  const gizmo = useStudio((s) => s.gizmo);
  const setGizmo = useStudio((s) => s.setGizmo);
  const update = useStudio((s) => s.update);
  const remove = useStudio((s) => s.remove);
  const select = useStudio((s) => s.select);
  const [palette, setPalette] = useState(false);
  const isPart = obj.kind === "part";

  return (
    <Html position={[0, y, 0]} zIndexRange={[40, 0]} calculatePosition={clampedPosition} style={{ pointerEvents: "none" }}>
      <div
        className="pointer-events-auto flex -translate-x-1/2 -translate-y-full flex-col items-center gap-1.5 pb-2 animate-float-in"
        onPointerDown={stop}
        onPointerUp={stop}
        onClick={stop}
        onWheel={stop}
      >
        {palette && isPart && (
          <div className="grid grid-cols-7 gap-1 rounded-lg border border-border bg-popover p-2 shadow-float">
            {PART_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Màu ${c}`}
                className="h-6 w-6 rounded-md border border-border ring-offset-2 ring-offset-popover transition-transform hover:scale-110 data-[on=true]:ring-2 data-[on=true]:ring-primary"
                data-on={obj.color.toLowerCase() === c}
                style={{ backgroundColor: c }}
                onClick={() => update(obj.id, { color: c })}
              />
            ))}
            <label className="col-span-7 mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              Màu tùy chọn
              <input
                type="color"
                value={obj.color}
                onChange={(e) => update(obj.id, { color: e.target.value })}
                className="h-6 w-10 cursor-pointer rounded border border-border bg-transparent"
              />
            </label>
          </div>
        )}
        {gizmo !== "none" && (
          <div className="flex gap-1 rounded-lg border border-border bg-popover p-1 shadow-float">
            <StudioButton size="sm" variant={gizmo === "translate" ? "toolActive" : "ghost"} onClick={() => setGizmo("translate")}>
              Di chuyển
            </StudioButton>
            <StudioButton size="sm" variant={gizmo === "scale" ? "toolActive" : "ghost"} onClick={() => setGizmo("scale")}>
              Kéo dài
            </StudioButton>
          </div>
        )}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-popover p-1 shadow-float">
          <StudioButton
            size="sm"
            variant={gizmo !== "none" ? "toolActive" : "tool"}
            onClick={() => setGizmo(gizmo === "none" ? "translate" : "none")}
          >
            <Move3d className="h-3.5 w-3.5" /> Di chuyển / Kéo dài
          </StudioButton>
          <StudioButton
            size="sm"
            variant="tool"
            onClick={() => {
              const [a, b, c] = obj.scale;
              const k = (v: number) => Math.min(30, Math.round(v * 1.2 * 100) / 100);
              update(obj.id, { scale: [k(a), k(b), k(c)] });
            }}
          >
            <Maximize2 className="h-3.5 w-3.5" /> Chỉnh to
          </StudioButton>
          {isPart && (
            <StudioButton size="sm" variant={palette ? "toolActive" : "tool"} onClick={() => setPalette((v) => !v)}>
              <Palette className="h-3.5 w-3.5" /> Chỉnh màu
            </StudioButton>
          )}
          <StudioButton size="sm" variant="danger" onClick={() => remove(obj.id)}>
            <Trash2 className="h-3.5 w-3.5" /> Xóa
          </StudioButton>
          <StudioButton size="icon" variant="tool" aria-label="Đóng" onClick={() => select(null)}>
            <X className="h-4 w-4" />
          </StudioButton>
        </div>
      </div>
    </Html>
  );
}
