import { autoLockOnFirstTap } from "@/game/orientation";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Clock, FolderOpen, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { StudioButton } from "@/components/studio/StudioButton";
import splash from "@/assets/splash-world.jpg";
import { newId } from "@/game/catalog";
import { deleteProject, listProjects } from "@/game/storage";
import type { Project } from "@/game/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bờm Studio Update 1.0 — Làm game 3D trên web" },
      { name: "description", content: "Bờm Studio: dựng thế giới 3D, thêm NPC, kiếm và chơi thử ngay trên trình duyệt." },
      { property: "og:title", content: "Bờm Studio Update 1.0" },
      { property: "og:description", content: "Dựng thế giới 3D, thêm NPC, kiếm và chơi thử ngay trên trình duyệt." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[] | null>(null);

  useEffect(() => {
    setProjects(listProjects());
  }, []);
  useEffect(() => autoLockOnFirstTap(), []);

  const open = (id: string) => navigate({ to: "/studio/$projectId", params: { projectId: id } });

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background text-foreground">
      <img src={splash} alt="" width={1920} height={1088} className="absolute inset-0 h-full w-full object-cover" />
      <div className="splash-veil absolute inset-0" />

      <div className="relative mx-auto flex min-h-dvh max-w-6xl flex-col items-center justify-center gap-[clamp(1rem,4vh,2.5rem)] px-6 py-6 text-center">
        <h1 className="splash-text animate-float-in text-balance font-extrabold leading-[1.05] tracking-tight">
          <span className="block text-[clamp(1rem,2.6vw,1.6rem)] font-semibold text-foreground/85">Chào mừng đến với</span>
          <span className="block text-[clamp(2.4rem,8vw,5.5rem)]">
            Bờm <span className="text-primary">Studio</span>
          </span>
          <span className="mt-2 inline-block rounded-full border border-primary/60 bg-overlay px-3 py-1 text-[clamp(0.75rem,1.6vw,1rem)] font-semibold text-primary backdrop-blur-md">
            Update 1.0
          </span>
        </h1>

        <StudioButton variant="primary" size="xl" className="animate-float-in [animation-delay:120ms]" onClick={() => open(newId())}>
          <Plus className="h-5 w-5" /> Tạo dự án
        </StudioButton>

        <section className="w-full animate-float-in [animation-delay:220ms]">
          <h2 className="mb-2 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <FolderOpen className="h-3.5 w-3.5" /> Dự án đã lưu
          </h2>
          {projects && projects.length === 0 && (
            <p className="text-sm text-muted-foreground">Chưa có dự án nào. Bấm “Lưu” trong Studio để giữ dự án tại đây.</p>
          )}
          {projects && projects.length > 0 && (
            <ul className="flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:thin] justify-start sm:justify-center">
              {projects.map((p) => (
                <li key={p.id} className="relative w-52 shrink-0 snap-start">
                  <button
                    type="button"
                    onClick={() => open(p.id)}
                    className="w-full rounded-xl border border-border bg-overlay p-3 text-left backdrop-blur-md transition-colors hover:border-primary hover:bg-accent"
                  >
                    <span className="block truncate pr-7 text-sm font-semibold">{p.name || "Dự án"}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{p.objects.length} vật thể</span>
                    <span className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(p.updatedAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Xóa ${p.name}`}
                    onClick={() => {
                      if (!window.confirm(`Xóa dự án “${p.name}”?`)) return;
                      deleteProject(p.id);
                      setProjects(listProjects());
                    }}
                    className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
