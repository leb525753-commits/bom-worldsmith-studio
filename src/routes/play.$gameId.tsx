import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Canvas } from "@react-three/fiber";
import { LogOut, RotateCcw, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { StudioButton } from "@/components/studio/StudioButton";
import { getAccount, type Account } from "@/game/accounts";
import { useMultiplayer } from "@/game/multiplayer";
import { runtime } from "@/game/runtime";
import { RemotePlayers } from "@/game/scene/RemotePlayers";
import { World } from "@/game/scene/World";
import { getGame } from "@/game/storage";
import { useStudio } from "@/game/store";
import { PlayHud, RotateHint } from "@/game/ui/Overlays";
import { useKeyboard } from "@/game/ui/useKeyboard";
import { autoLockOnFirstTap } from "@/game/orientation";

export const Route = createFileRoute("/play/$gameId")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Chơi chung — Bờm Studio" },
      { name: "description", content: "Vào chơi chung game 3D do người chơi Bờm Studio tạo ra." },
      { property: "og:title", content: "Chơi chung — Bờm Studio" },
      { property: "og:description", content: "Vào chơi chung game 3D do người chơi Bờm Studio tạo ra." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlayGame,
});

function PlayGame() {
  const { gameId } = Route.useParams();
  const navigate = useNavigate();
  const project = useStudio((s) => s.project);
  const mode = useStudio((s) => s.mode);
  const [me, setMe] = useState<Account | null>(null);
  const [info, setInfo] = useState<{ owner: string } | null>(null);
  const [missing, setMissing] = useState(false);
  const players = useMultiplayer(info ? gameId : null, me);
  useKeyboard();
  useEffect(() => autoLockOnFirstTap(), []);

  useEffect(() => {
    let off = false;
    void (async () => {
      const acc = await getAccount();
      if (off) return;
      if (!acc) return navigate({ to: "/", replace: true });
      const g = await getGame(gameId).catch(() => null);
      if (off) return;
      if (!g) return setMissing(true);
      const st = useStudio.getState();
      st.open(g.project, false, acc);
      st.play();
      setMe(acc);
      setInfo({ owner: g.ownerName });
    })();
    return () => {
      off = true;
      runtime.current = null;
      useStudio.setState({ mode: "edit", project: null });
    };
  }, [gameId, navigate]);

  if (missing) {
    return (
      <div className="grid h-dvh place-items-center bg-background p-6 text-center text-foreground">
        <div>
          <p className="text-lg font-bold">Không tìm thấy game này</p>
          <StudioButton className="mt-3" onClick={() => navigate({ to: "/games" })}>Về danh sách game</StudioButton>
        </div>
      </div>
    );
  }
  if (!project || project.id !== gameId || !info || mode !== "play") {
    return <div className="grid h-dvh place-items-center bg-background text-sm text-muted-foreground">Đang vào game…</div>;
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-viewport text-foreground">
      <Canvas shadows dpr={[1, 1.75]} camera={{ position: [14, 12, 18], fov: 50, near: 0.1, far: 1000 }}>
        <World />
        <RemotePlayers players={players} />
      </Canvas>
      <div className="pointer-events-none absolute inset-0">
        <PlayHud />
      </div>
      <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
        <div className="flex gap-2">
          <StudioButton size="sm" onClick={() => { useStudio.getState().stop(); useStudio.getState().play(); }}>
            <RotateCcw className="h-4 w-4" /> Chơi lại
          </StudioButton>
          <StudioButton size="sm" variant="stop" onClick={() => navigate({ to: "/games" })}>
            <LogOut className="h-4 w-4" /> Thoát
          </StudioButton>
        </div>
        <div className="w-44 rounded-lg border border-border bg-overlay p-2 text-xs backdrop-blur-md">
          <p className="truncate font-semibold">{project.name || "Game"}</p>
          <p className="truncate text-muted-foreground">của {info.owner}</p>
          <p className="mt-1.5 flex items-center gap-1 font-semibold text-primary">
            <Users className="h-3.5 w-3.5" /> {players.length + 1} người đang chơi
          </p>
          <ul className="mt-1 space-y-0.5">
            <li className="truncate">● {me?.name} (bạn)</li>
            {players.map((p) => (
              <li key={p.id} className="truncate text-muted-foreground">● {p.name}</li>
            ))}
          </ul>
        </div>
      </div>
      <RotateHint />
    </div>
  );
}
