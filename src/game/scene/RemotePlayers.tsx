import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";
import { remotes } from "../multiplayer";
import { animateLimbs, Avatar, useLimbs } from "./models";

function RemoteAvatar({ id, name }: { id: string; name: string }) {
  const ref = useRef<THREE.Group>(null);
  const bar = useRef<HTMLDivElement>(null);
  const limbs = useLimbs();
  const placed = useRef(false);
  useFrame((state, dt) => {
    const r = remotes.get(id);
    const g = ref.current;
    if (!r || !g) return;
    g.visible = r.alive;
    if (bar.current) bar.current.style.width = `${Math.max(0, Math.min(100, r.hp ?? 100))}%`;
    const k = placed.current ? 1 - Math.exp(-dt * 12) : 1;
    placed.current = true;
    g.position.x += (r.x - g.position.x) * k;
    g.position.y += (r.y - g.position.y) * k;
    g.position.z += (r.z - g.position.z) * k;
    let d = r.yaw - g.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    g.rotation.y += d * k;
    animateLimbs(limbs.current, state.clock.elapsedTime, r.moving);
  });
  return (
    <group ref={ref}>
      <Avatar limbs={limbs} skin="#f5cd30" shirt="#c4281c" pants="#1b2a35" />
      <Html center position={[0, 2.9, 0]} zIndexRange={[10, 0]}>
        <div className="pointer-events-none whitespace-nowrap rounded-md bg-overlay px-1.5 py-0.5 text-[11px] font-semibold text-foreground backdrop-blur-md">
          {name}
          <div className="mt-0.5 h-1 w-14 overflow-hidden rounded-full bg-hp-track">
            <div ref={bar} className="h-full rounded-full bg-hp" style={{ width: "100%" }} />
          </div>
        </div>
      </Html>
    </group>
  );
}

export function RemotePlayers({ players }: { players: Array<{ id: string; name: string }> }) {
  return (
    <>
      {players.map((p) => (
        <RemoteAvatar key={p.id} id={p.id} name={p.name} />
      ))}
    </>
  );
}
