import { autoLockOnFirstTap } from "@/game/orientation";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Clock, FolderOpen, Gamepad2, LogIn, LogOut, Plus, Trash2, UserRound } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { StudioButton } from "@/components/studio/StudioButton";
import splash from "@/assets/splash-world.jpg";
import { getAccount, login, logout, type Account } from "@/game/accounts";
import { newId } from "@/game/catalog";
import { deleteProject, importLocalProjects, listGames, type GameSummary } from "@/game/storage";

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
  const [projects, setProjects] = useState<GameSummary[] | null>(null);
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async (acc: Account) => setProjects(await listGames(acc.id).catch(() => []));
  useEffect(() => {
    void getAccount().then((acc) => {
      setAccount(acc);
      if (acc) void refresh(acc);
    });
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await login(name, pass);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setError("");
    setPass("");
    const acc = await getAccount();
    setAccount(acc);
    if (acc) {
      await importLocalProjects(acc);
      void refresh(acc);
    }
  };
  const field =
    "h-11 w-full rounded-lg border border-border bg-input px-3 text-sm outline-none focus:border-primary";
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

        {account === null && !showForm && (
          <StudioButton variant="primary" size="xl" className="animate-float-in [animation-delay:120ms]" onClick={() => setShowForm(true)}>
            <LogIn className="h-5 w-5" /> Đăng nhập
          </StudioButton>
        )}
        {account === null && showForm && (
          <form onSubmit={submit} className="grid w-full max-w-xs gap-2 rounded-xl border border-border bg-overlay p-4 backdrop-blur-md animate-float-in">
            <input className={field} placeholder="Tên" aria-label="Tên" autoComplete="username" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <input className={field} placeholder="Mật khẩu" aria-label="Mật khẩu" type="password" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} />
            <StudioButton type="submit" variant="primary" size="lg" disabled={busy}>
              <LogIn className="h-4 w-4" /> Đăng nhập
            </StudioButton>
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <p className="text-[11px] text-muted-foreground">Tên mới sẽ tự tạo tài khoản. Tên cũ cần đúng mật khẩu.</p>
          </form>
        )}
        {account && (
        <>
        <div className="flex items-center gap-2 rounded-full border border-border bg-overlay px-3 py-1 text-sm backdrop-blur-md">
          <UserRound className="h-4 w-4 text-primary" /> {account.name}
          <button
            type="button"
            className="ml-1 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => {
              void logout();
              setAccount(null);
              setShowForm(true);
              setProjects([]);
            }}
          >
            <LogOut className="h-3.5 w-3.5" /> Đăng xuất
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 animate-float-in [animation-delay:120ms]">
          <StudioButton variant="primary" size="xl" onClick={() => open(newId())}>
            <Plus className="h-5 w-5" /> Tạo dự án
          </StudioButton>
          <StudioButton variant="play" size="xl" onClick={() => navigate({ to: "/games" })}>
            <Gamepad2 className="h-5 w-5" /> Game
          </StudioButton>
        </div>

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
                    className="w-full overflow-hidden rounded-xl border border-border bg-overlay p-3 text-left backdrop-blur-md transition-colors hover:border-primary hover:bg-accent"
                  >
                    {p.coverUrl && (
                      <img src={p.coverUrl} alt="" loading="lazy" className="-mx-3 -mt-3 mb-2 aspect-video w-[calc(100%+1.5rem)] max-w-none object-cover" />
                    )}
                    <span className="block truncate pr-7 text-sm font-semibold">{p.name || "Dự án"}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{p.objectCount} vật thể</span>
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
                      setProjects((list) => list?.filter((x) => x.id !== p.id) ?? null);
                      void deleteProject(p.id);
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
        </>
        )}
      </div>
    </div>
  );
}
