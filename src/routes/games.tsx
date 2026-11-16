import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Clock, Gamepad2, Pencil, Play, RefreshCw, UserRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { StudioButton } from "@/components/studio/StudioButton";
import { getAccount, type Account } from "@/game/accounts";
import { listGames, type GameSummary } from "@/game/storage";

export const Route = createFileRoute("/games")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Game — Bờm Studio" },
      { name: "description", content: "Xem các game mọi người đã lưu trên Bờm Studio và vào chơi chung." },
      { property: "og:title", content: "Game — Bờm Studio" },
      { property: "og:description", content: "Các game mọi người đã làm trên Bờm Studio, vào chơi chung ngay." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Games,
});

function Games() {
  const navigate = useNavigate();
  const [me, setMe] = useState<Account | null>(null);
  const [games, setGames] = useState<GameSummary[] | null>(null);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    setError(false);
    try {
      setGames(await listGames());
    } catch {
      setError(true);
      setGames([]);
    }
  }, []);

  useEffect(() => {
    void getAccount().then((acc) => {
      if (!acc) {
        void navigate({ to: "/", replace: true });
        return;
      }
      setMe(acc);
      void refresh();
    });
  }, [navigate, refresh]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b border-border bg-panel-header px-3">
        <StudioButton size="sm" variant="ghost" onClick={() => navigate({ to: "/" })}>
          <ArrowLeft className="h-4 w-4" /> Trang chủ
        </StudioButton>
        <h1 className="flex items-center gap-2 text-base font-extrabold">
          <Gamepad2 className="h-5 w-5 text-primary" /> Game
        </h1>
        <StudioButton size="sm" variant="ghost" className="ml-auto" onClick={() => void refresh()}>
          <RefreshCw className="h-4 w-4" /> Làm mới
        </StudioButton>
      </header>

      <main className="mx-auto max-w-6xl p-4">
        <p className="mb-4 text-sm text-muted-foreground">Game của bạn và của mọi người. Bấm “Chơi” để vào cùng một phòng và chơi chung.</p>
        {games === null && <p className="text-sm text-muted-foreground">Đang tải…</p>}
        {error && <p className="text-sm text-destructive">Không tải được danh sách game, hãy bấm Làm mới.</p>}
        {games && games.length === 0 && !error && <p className="text-sm text-muted-foreground">Chưa có game nào được lưu.</p>}
        {games && games.length > 0 && (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3">
            {games.map((g) => {
              const mine = g.ownerId === me?.id;
              return (
                <li key={g.id} className="flex flex-col gap-2 overflow-hidden rounded-xl border border-border bg-panel p-3">
                  <div className="-mx-3 -mt-3 aspect-video bg-muted">
                    {g.coverUrl ? (
                      <img src={g.coverUrl} alt={`Ảnh bìa ${g.name}`} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center text-muted-foreground"><Gamepad2 className="h-8 w-8" /></div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{g.name || "Dự án"}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <UserRound className="h-3 w-3" /> {g.ownerName}
                      {mine && <span className="ml-1 rounded bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">Của bạn</span>}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" /> {g.objectCount} vật thể ·{" "}
                      {new Date(g.updatedAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  </div>
                  <div className="mt-auto flex gap-2">
                    <StudioButton variant="play" size="sm" className="flex-1" onClick={() => navigate({ to: "/play/$gameId", params: { gameId: g.id } })}>
                      <Play className="h-4 w-4 fill-current" /> Chơi
                    </StudioButton>
                    {mine && (
                      <StudioButton size="sm" onClick={() => navigate({ to: "/studio/$projectId", params: { projectId: g.id } })}>
                        <Pencil className="h-4 w-4" /> Sửa
                      </StudioButton>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
