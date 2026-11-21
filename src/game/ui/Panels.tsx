import { 
  Bot, Box, Braces, Building2, Code, FileCode, FlaskConical, House, ImageUp, 
  ListTree, Maximize2, Move3d, Palette, Play, Route, Save, Shrub, Sparkles, 
  Square, Sword, Terminal, Trash2, TreeDeciduous, User, X 
} from "lucide-react";
import { useMemo, useRef, useState, type ComponentType } from "react";
import { toast } from "sonner";
import { StudioButton } from "@/components/studio/StudioButton";
import { cn } from "@/lib/utils";
import { displayNames, PART_COLORS } from "../catalog";
import { setCover } from "../storage";
import { useStudio } from "../store";
import type { GameObject, ObjKind } from "../types";

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

// Danh sách các phím tắt chèn nhanh code Lua
const LUA_SNIPPETS = [
  { label: "💥 Chạm (Touched)", code: 'part.Touched:Connect(function(hit)\n    \nend)\n' },
  { label: "🩸 Trừ 10 máu", code: 'local humanoid = hit.Parent:FindFirstChild("Humanoid")\nif humanoid then\n    humanoid.Health = humanoid.Health - 10\nend\n' },
  { label: "💚 Hồi 20 máu", code: 'local humanoid = hit.Parent:FindFirstChild("Humanoid")\nif humanoid then\n    humanoid.Health = humanoid.Health + 20\nend\n' },
  { label: "💰 +100 Tiền", code: 'local player = game.Players:GetPlayerFromCharacter(hit.Parent)\nif player then\n    player.leaderstats.Money.Value = player.leaderstats.Money.Value + 100\nend\n' },
  { label: "🌀 Dịch chuyển", code: 'hit.Parent.HumanoidRootPart.Position = Vector3.new(0, 5, 0)\n' },
  { label: "🎨 Đổi màu đỏ", code: 'part.Color = Color3.fromRGB(255, 0, 0)\n' },
  { label: "👻 Tàng hình", code: 'part.Transparency = 1\npart.CanCollide = false\n' },
  { label: "⏱ wait(1)", code: 'wait(1)\n' },
  { label: "Vector3.new", code: 'Vector3.new(0, 0, 0)' },
  { label: "print()", code: 'print("Hello Bờm Studio")\n' },
];

/** Modal soạn thảo Script Lua kèm nút phím tắt */
function LuaEditorModal({ obj, onClose }: { obj: GameObject; onClose: () => void }) {
  const update = useStudio((s) => s.update);
  const initialCode = (obj as any).luaScript || `-- Script Lua cho: ${obj.kind.toUpperCase()}\nlocal part = script.Parent\n\npart.Touched:Connect(function(hit)\n    print("Chạm vào Part!")\nend)\n`;
  const [code, setCode] = useState(initialCode);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertSnippet = (snippet: string) => {
    const el = textareaRef.current;
    if (!el) {
      setCode((c) => c + snippet);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = code.slice(0, start) + snippet + code.slice(end);
    setCode(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 10);
  };

  const handleSave = () => {
    (update as any)(obj.id, { luaScript: code });
    toast.success("Đã lưu Script Lua cho vật thể!");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm animate-fade-in">
      <div className="flex h-[92vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <FileCode className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Lua Script: {obj.kind.toUpperCase()}</span>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Thanh phím tắt chèn nhanh Lua */}
        <div className="border-b border-border bg-muted/20 p-2">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <Sparkles className="h-3 w-3 text-warning" /> Nút chèn code nhanh (chạm là tự thêm):
          </div>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
            {LUA_SNIPPETS.map((snip) => (
              <button
                key={snip.label}
                type="button"
                onClick={() => insertSnippet(snip.code)}
                className="rounded-md border border-border bg-secondary px-2 py-1 text-xs font-medium text-foreground transition-all hover:border-primary hover:bg-accent active:scale-95"
              >
                {snip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Khung soạn thảo */}
        <div className="flex-1 p-2">
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className="h-full w-full resize-none rounded-lg border border-border bg-background p-3 font-mono text-xs leading-relaxed text-foreground focus:border-primary focus:outline-none"
            placeholder="Viết code Lua 5.1 ở đây..."
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-3 py-2">
          <span className="text-[11px] text-muted-foreground">Chuẩn cú pháp Lua 5.1 (Roblox)</span>
          <div className="flex gap-2">
            <StudioButton size="sm" variant="ghost" onClick={onClose}>Hủy</StudioButton>
            <StudioButton size="sm" variant="primary" onClick={handleSave}>Lưu Script</StudioButton>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Bảng thuộc tính che kín cột bên phải khi một vật thể được chọn */
function SelectedObjectPanel({ obj }: { obj: GameObject }) {
  const gizmo = useStudio((s) => s.gizmo);
  const setGizmo = useStudio((s) => s.setGizmo);
  const update = useStudio((s) => s.update);
  const remove = useStudio((s) => s.remove);
  const select = useStudio((s) => s.select);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const isPart = obj.kind === "part" || obj.kind === "block";

  return (
    <aside className="flex w-[clamp(8.5rem,15vw,13rem)] shrink-0 flex-col overflow-y-auto border-l border-border bg-panel">
      {/* Tiêu đề & nút đóng */}
      <div className="flex items-center justify-between border-b border-border px-2.5 py-2 font-semibold text-xs bg-muted/40">
        <span className="truncate uppercase text-primary tracking-wide">{obj.kind}</span>
        <button 
          type="button" 
          aria-label="Đóng" 
          onClick={() => select(null)} 
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-1.5 p-2">
        {/* Nút Script Lua mới */}
        <StudioButton 
          variant="primary" 
          block 
          className={BTN} 
          onClick={() => setShowScriptModal(true)}
        >
          <FileCode className="h-4 w-4" /> Script (Lua)
        </StudioButton>

        {/* Di chuyển & Kéo dài */}
        <StudioButton
          block
          className={BTN}
          variant={gizmo === "translate" ? "toolActive" : "tool"}
          onClick={() => setGizmo(gizmo === "translate" ? "none" : "translate")}
        >
          <Move3d className="h-3.5 w-3.5" /> Di chuyển
        </StudioButton>

        <StudioButton
          block
          className={BTN}
          variant={gizmo === "scale" ? "toolActive" : "tool"}
          onClick={() => setGizmo(gizmo === "scale" ? "none" : "scale")}
        >
          <Maximize2 className="h-3.5 w-3.5" /> Kéo dài
        </StudioButton>

        {/* Phóng to */}
        <StudioButton
          block
          className={BTN}
          variant="tool"
          onClick={() => {
            const [a, b, c] = obj.scale;
            const k = (v: number) => Math.min(30, Math.round(v * 1.2 * 100) / 100);
            update(obj.id, { scale: [k(a), k(b), k(c)] });
          }}
        >
          <Maximize2 className="h-3.5 w-3.5" /> Chỉnh to (+20%)
        </StudioButton>

        {/* Đổi màu */}
        {isPart && (
          <>
            <StudioButton 
              block 
              className={BTN} 
              variant={showPalette ? "toolActive" : "tool"} 
              onClick={() => setShowPalette((v) => !v)}
            >
              <Palette className="h-3.5 w-3.5" /> Đổi màu
            </StudioButton>

            {showPalette && (
              <div className="grid grid-cols-4 gap-1 rounded-lg border border-border bg-popover p-1.5 shadow-md">
                {PART_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Màu ${c}`}
                    className="h-6 w-full rounded border border-border transition-transform hover:scale-105"
                    style={{ backgroundColor: c }}
                    onClick={() => update(obj.id, { color: c })}
                  />
                ))}
                <label className="col-span-4 mt-1 flex items-center justify-between gap-1 text-[10px] text-muted-foreground">
                  Tùy chọn:
                  <input
                    type="color"
                    value={obj.color}
                    onChange={(e) => update(obj.id, { color: e.target.value })}
                    className="h-5 w-8 cursor-pointer rounded border border-border bg-transparent"
                  />
                </label>
              </div>
            )}
          </>
        )}

        {/* Nút Xóa */}
        <StudioButton 
          variant="danger" 
          block 
          className={BTN} 
          onClick={() => {
            remove(obj.id);
            select(null);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" /> Xóa vật thể
        </StudioButton>
      </div>

      {showScriptModal && <LuaEditorModal obj={obj} onClose={() => setShowScriptModal(false)} />}
    </aside>
  );
}

export function ControlPanel({ onCode, onCodeGame, onAi }: { onCode: () => void; onCodeGame: () => void; onAi: () => void }) {
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
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Nếu đang có vật thể được chọn trong lúc Edit: hiện Bảng chi tiết che kín bên phải!
  const selectedObj = objects?.find((o) => o.id === selectedId);
  if (selectedObj && !playing) {
    return <SelectedObjectPanel obj={selectedObj} />;
  }

  const pickCover = async (file: File | undefined) => {
    const { project, account } = useStudio.getState();
    if (!file || !project || !account) return;
    setUploading(true);
    try {
      await save();
      await setCover(project.id, file, account);
      toast.success("Đã đổi ảnh bìa game");
    } catch {
      toast.error("Không tải được ảnh bìa, hãy thử ảnh khác");
    } finally {
      setUploading(false);
    }
  };

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
            save().then(
              () => toast.success("Đã lưu dự án"),
              () => toast.error("Lưu thất bại, hãy thử lại"),
            );
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
        <StudioButton variant="primary" block className={BTN} disabled={playing} onClick={onAi}>
          <Bot className="h-4 w-4" /> AI
        </StudioButton>
        <StudioButton block className={BTN} disabled={playing || uploading} onClick={() => fileRef.current?.click()}>
          <ImageUp className="h-4 w-4" /> {uploading ? "Đang tải…" : "Ảnh bìa"}
        </StudioButton>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            void pickCover(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
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
                
