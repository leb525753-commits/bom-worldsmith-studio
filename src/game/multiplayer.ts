import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Account } from "./accounts";
import { runtime } from "./runtime";

/** Other players in the same game room. Positions live outside React, like the play runtime. */
export interface Remote {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  moving: boolean;
  alive: boolean;
  seen: number;
}
type PosMsg = Omit<Remote, "seen">;

export const remotes = new Map<string, Remote>();

const SEND_MS = 100;
const HEARTBEAT_MS = 2000;
const STALE_MS = 6000;

export function useMultiplayer(gameId: string | null, me: Account | null) {
  const [players, setPlayers] = useState<Array<{ id: string; name: string }>>([]);
  useEffect(() => {
    if (!gameId || !me) return;
    const myId = `${me.id}:${Math.random().toString(36).slice(2, 8)}`;
    remotes.clear();
    const sync = () => setPlayers([...remotes.values()].map((r) => ({ id: r.id, name: r.name })));
    const ch = supabase.channel(`game-room:${gameId}`, { config: { broadcast: { self: false }, presence: { key: myId } } });
    ch.on("broadcast", { event: "pos" }, ({ payload }) => {
      const p = payload as PosMsg | undefined;
      if (!p || typeof p.id !== "string" || p.id === myId) return;
      const isNew = !remotes.has(p.id);
      remotes.set(p.id, { ...p, seen: Date.now() });
      if (isNew) sync();
    });
    ch.on("presence", { event: "leave" }, ({ key }) => {
      if (remotes.delete(key)) sync();
    });
    let joined = false;
    ch.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return;
      joined = true;
      await ch.track({ name: me.name });
    });

    let last = "";
    let lastAt = 0;
    const timer = window.setInterval(() => {
      const now = Date.now();
      const p = runtime.current?.player;
      if (joined && p) {
        const msg: PosMsg = { id: myId, name: me.name, x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), yaw: +p.yaw.toFixed(2), moving: p.moving, alive: p.alive };
        const sig = `${msg.x},${msg.y},${msg.z},${msg.yaw},${msg.moving},${msg.alive}`;
        if (sig !== last || now - lastAt > HEARTBEAT_MS) {
          last = sig;
          lastAt = now;
          void ch.send({ type: "broadcast", event: "pos", payload: msg });
        }
      }
      let changed = false;
      for (const [k, r] of remotes) if (now - r.seen > STALE_MS) changed = remotes.delete(k) || changed;
      if (changed) sync();
    }, SEND_MS);

    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(ch);
      remotes.clear();
      setPlayers([]);
    };
  }, [gameId, me]);
  return players;
}
