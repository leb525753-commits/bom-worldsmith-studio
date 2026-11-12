import { autoLockOnFirstTap } from "@/game/orientation";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Canvas } from "@react-three/fiber";
import { Home } from "lucide-react";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { StudioButton } from "@/components/studio/StudioButton";
import { World } from "@/game/scene/World";
import { input, runtime } from "@/game/runtime";
import { useStudio } from "@/game/store";
import { CodeDialog, CodeGameDialog } from "@/game/ui/CodeDialogs";
import { doDrop, doSwing, NavPad, PlayHud, RotateHint } from "@/game/ui/Overlays";
import { ControlPanel, ModelStore } from "@/game/ui/Panels";

export const Route = createFileRoute("/studio/$projectId")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Studio — Bờm Studio" },
      { name: "description", content: "Trình chỉnh sửa game 3D của Bờm Studio: đặt vật thể, viết code và chơi thử." },
      { property: "og:title", content: "Studio — Bờm Studio" },
      { property: "og:description", content: "Trình chỉnh sửa game 3D của Bờm Studio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Studio,
});

function useKeyboard() {
  useEffect(() => {
    const isTyping = (t: EventTarget | null) =>
      t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    const down = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
      input.keys.add(e.code);
      const st = useStudio.getState();
      if (st.mode === "play" && runtime.current) {
        if (e.code === "Space" || e.code === "KeyJ") doSwing();
        if (e.code === "KeyG" || (e.code === "KeyQ" && !e.repeat)) doDrop();
      } else if (e.code === "Escape") st.select(null);
      else if ((e.code === "Delete" || e.code === "Backspace") && st.selectedId) st.remove(st.selectedId);
    };
    const up = (e: KeyboardEvent) => input.keys.delete(e.code);
    const clear = () => input.keys.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
    };
  }, []);
}

function Studio() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const project = useStudio((s) => s.project);
  const load = useStudio((s) => s.load);
  const rename = useStudio((s) => s.rename);
  const dirty = useStudio((s) => s.dirty);
  const mode = useStudio((s) => s.mode);
  const [dialog, setDialog] = useState<"code" | "game" | null>(null);
  const [ready, setReady] = useState(false);
  useKeyboard();
  useEffect(() => autoLockOnFirstTap(), []);

  useEffect(() => {
    load(projectId);
    return () => {
      runtime.current = null;
      useStudio.setState({ mode: "edit" });
    };
  }, [projectId, load]);

  if (!project || project.id !== projectId) {
    return <div className="grid h-dvh place-items-center bg-background text-sm text-muted-foreground">Đang mở dự án…</div>;
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-10 shrink-0 items-center gap-2 border-b border-border bg-panel-header px-2">
        <StudioButton
          size="sm"
          variant="ghost"
          onClick={() => {
            if (dirty && !window.confirm("Dự án chưa được lưu. Vẫn quay về trang chủ?")) return;
            navigate({ to: "/" });
          }}
        >
          <Home className="h-4 w-4" />
        </StudioButton>
        <Link to="/" className="hidden text-sm font-extrabold tracking-tight sm:block">
          Bờm <span className="text-primary">Studio</span>
        </Link>
        <span className="hidden h-4 w-px bg-border sm:block" />
        <input
          value={project.name}
          onChange={(e) => rename(e.target.value)}
          disabled={mode === "play"}
          aria-label="Tên dự án"
          className="h-7 w-[min(16rem,35vw)] rounded-md border border-transparent bg-transparent px-2 text-sm font-medium outline-none hover:border-border focus:border-primary focus:bg-input"
        />
        <span className={dirty ? "text-[11px] text-warning" : "text-[11px] text-muted-foreground"}>
          {dirty ? "● Chưa lưu" : "Đã lưu"}
        </span>
        <span className="ml-auto rounded-full border border-border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider">
          {mode === "play" ? <span className="text-success">● Đang chơi thử</span> : <span className="text-muted-foreground">Chỉnh sửa</span>}
        </span>
      </header>

      <div className="flex min-h-0 flex-1">
        <ModelStore />
        <main className="relative min-w-0 flex-1 bg-viewport" data-scene-ready={ready || undefined}>
          <Canvas
            shadows
            dpr={[1, 1.75]}
            camera={{ position: [14, 12, 18], fov: 50, near: 0.1, far: 1000 }}
            onCreated={() => requestAnimationFrame(() => setReady(true))}
          >
            <World />
          </Canvas>
          <div className="pointer-events-none absolute inset-0">
            {mode === "edit" ? (
              <>
                <p className="absolute left-3 top-3 rounded-md bg-overlay px-2 py-1 text-[11px] text-muted-foreground backdrop-blur-md">
                  Kéo để xoay · Chạm vào vật thể để chọn
                </p>
                <NavPad />
              </>
            ) : (
              <PlayHud />
            )}
          </div>
        </main>
        <ControlPanel onCode={() => setDialog("code")} onCodeGame={() => setDialog("game")} />
      </div>

      {dialog === "code" && <CodeDialog onClose={() => setDialog(null)} />}
      {dialog === "game" && <CodeGameDialog onClose={() => setDialog(null)} />}
      <RotateHint />
      <Toaster theme="dark" position="top-center" richColors />
    </div>
  );
}
