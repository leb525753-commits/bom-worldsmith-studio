import { Play } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { StudioButton } from "@/components/studio/StudioButton";
import { makeObject } from "../catalog";
import { applyCode, objectsToCode, parseGameCode, type CodeError } from "../sim/codeParser";
import { spawnPoint, useStudio } from "../store";
import type { GameObject } from "../types";
import { Modal } from "./Modal";

export function CodeDialog({ onClose }: { onClose: () => void }) {
  const objects = useStudio((s) => s.project?.objects ?? []);
  const setObjects = useStudio((s) => s.setObjects);
  const [text, setText] = useState(() => objectsToCode(objects));

  const close = () => {
    const res = applyCode(useStudio.getState().project?.objects ?? [], text);
    if (res.changed > 0) {
      setObjects(res.objects);
      toast.success(`Đã cập nhật ${res.changed} thuộc tính`);
    }
    if (res.errors.length) toast.warning(`Bỏ qua ${res.errors.length} dòng không hợp lệ`, { description: res.errors.map((e) => `Dòng ${e.line}: ${e.message}`).join("\n") });
    onClose();
  };

  return (
    <Modal
      title="Code — Thuộc tính vật liệu"
      subtitle="Sửa số trong <dame …> hoặc <máu …>, đóng bảng để áp dụng"
      onClose={close}
      footer={<StudioButton variant="primary" onClick={close}>Đóng & áp dụng</StudioButton>}
    >
      {objects.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Chưa có vật thể nào trong game.</p>
      ) : (
        <textarea
          className="code-area h-[min(50vh,22rem)]"
          spellCheck={false}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      )}
    </Modal>
  );
}

const EXAMPLE = `-tạo một npc-máu 100
-dân thường

-tạo một npc-máu 200
-quái vật
+5 dame

-tạo nhà
-tạo cây táo`;

export function CodeGameDialog({ onClose }: { onClose: () => void }) {
  const script = useStudio((s) => s.project?.script ?? "");
  const setScript = useStudio((s) => s.setScript);
  const spawnMany = useStudio((s) => s.spawnMany);
  const [text, setText] = useState(script || EXAMPLE);
  const [log, setLog] = useState<{ ok: string[]; errors: CodeError[] } | null>(null);

  const run = () => {
    setScript(text);
    const { commands, errors } = parseGameCode(text);
    const created: GameObject[] = [];
    const ok: string[] = [];
    for (const c of commands) {
      if (c.type === "npc") {
        created.push(makeObject("npc", spawnPoint(5), { npcType: c.npcType, hp: c.hp, damage: c.damage }));
        ok.push(c.npcType === "monster" ? `Quái vật · ${c.hp} máu · ${c.damage} dame` : `Dân thường · ${c.hp} máu`);
      } else if (c.type === "block") {
        created.push(makeObject("block", spawnPoint(6), { color: c.color, effect: c.effect, effectValue: c.value }));
        ok.push(`Block ${c.colorName}${c.effect === "vanish" ? " · chạm biến mất" : c.effect === "hurt" ? ` · chạm mất ${c.value} máu` : ""}`);
      } else {
        created.push(makeObject(c.kind, spawnPoint(c.kind === "road" ? 2 : 6)));
        ok.push({ house: "Nhà", house2: "Nhà 2 tầng", potion: "Bình thuốc", tree: "Cây táo", road: "Đường", bush: "Bụi cây", sword: "Kiếm", part: "Part" }[c.kind]);
      }
    }
    if (created.length) spawnMany(created);
    setLog({ ok, errors });
    if (created.length) toast.success(`Đã tạo ${created.length} đối tượng`);
  };

  return (
    <Modal
      title="Code Game"
      subtitle="Tạo NPC và vật thể bằng lệnh"
      onClose={() => {
        setScript(text);
        onClose();
      }}
      footer={
        <StudioButton variant="play" onClick={run}>
          <Play className="h-4 w-4" /> Chạy Code
        </StudioButton>
      }
    >
      <div className="grid gap-3 md:grid-cols-[1fr_14rem]">
        <textarea
          className="code-area h-[min(48vh,20rem)]"
          spellCheck={false}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={EXAMPLE}
        />
        <div className="space-y-3 text-xs text-muted-foreground">
          <div>
            <p className="mb-1 font-semibold text-foreground">Cú pháp</p>
            <pre className="whitespace-pre-wrap rounded-md bg-viewport p-2 font-mono text-[11px] leading-5">{`-tạo một npc-máu 100
-dân thường

-tạo một npc-máu 200
-quái vật
+5 dame

-tạo nhà / cây táo
-tạo đường / bụi cây

-tạo block-màu đỏ
(trắng, đỏ, xanh lá,
 xanh biển, đen)
+thêm chức năng=chạm biến mất
+thêm chức năng=chạm mất 10 máu`}</pre>
          </div>
          {log && (
            <div className="space-y-1">
              {log.ok.map((l, i) => (
                <p key={i} className="text-success">✓ {l}</p>
              ))}
              {log.errors.map((e, i) => (
                <p key={i} className="text-destructive">
                  ✕ Dòng {e.line}: {e.message}
                </p>
              ))}
              {!log.ok.length && !log.errors.length && <p>Không có lệnh nào.</p>}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
