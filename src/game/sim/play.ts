import type { Project } from "../types";

export const TUNING = {
  PLAYER_SPEED: 6,
  CIVILIAN_SPEED: 1.8,
  MONSTER_SPEED: 3.4,
  MONSTER_AGGRO: 20,
  MONSTER_REACH: 1.6,
  MONSTER_COOLDOWN: 1,
  SWORD_REACH: 2.8,
  SWING_TIME: 0.35,
  SWING_COOLDOWN: 0.4,
  PICKUP_RADIUS: 1.4,
  WORLD_HALF: 58,
  WANDER_RADIUS: 12,
  ACTOR_RADIUS: 0.5,
  TURN: 12,
};

export type Role = "player" | "civilian" | "monster";

export interface Actor {
  id: string;
  role: Role;
  x: number;
  z: number;
  yaw: number;
  hp: number;
  maxHp: number;
  damage: number;
  alive: boolean;
  speed: number;
  moving: boolean;
  homeX: number;
  homeZ: number;
  targetX: number;
  targetZ: number;
  wait: number;
  attackCd: number;
  hitT: number;
}

export interface SwordState {
  id: string;
  x: number;
  z: number;
  damage: number;
  held: boolean;
}

export interface Box {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface PlayState {
  player: Actor;
  npcs: Actor[];
  swords: SwordState[];
  heldSwordId: string | null;
  pickupLock: string | null;
  swingT: number;
  swingCd: number;
  obstacles: Box[];
  time: number;
}

function actor(id: string, role: Role, x: number, z: number, hp: number, damage: number, speed: number): Actor {
  return {
    id, role, x, z, yaw: 0, hp, maxHp: hp, damage, alive: hp > 0, speed, moving: false,
    homeX: x, homeZ: z, targetX: x, targetZ: z, wait: 0.5, attackCd: 0, hitT: 0,
  };
}

export function createPlayState(project: Project): PlayState {
  const [px, , pz] = project.player.position;
  const npcs: Actor[] = [];
  const swords: SwordState[] = [];
  const obstacles: Box[] = [];
  for (const o of project.objects) {
    const [x, , z] = o.position;
    const [sx, sy, sz] = o.scale;
    if (o.kind === "npc") {
      const monster = o.npcType === "monster";
      npcs.push(actor(o.id, monster ? "monster" : "civilian", x, z, o.hp ?? 100, o.damage ?? 0,
        monster ? TUNING.MONSTER_SPEED : TUNING.CIVILIAN_SPEED));
    } else if (o.kind === "sword") {
      swords.push({ id: o.id, x, z, damage: o.damage ?? 10, held: false });
    } else if (o.kind === "house") {
      obstacles.push({ minX: x - 2 * sx, maxX: x + 2 * sx, minZ: z - 2 * sz, maxZ: z + 2 * sz });
    } else if (o.kind === "part" && sy * 1 + o.position[1] > 0.6 && o.position[1] < 2) {
      obstacles.push({ minX: x - sx, maxX: x + sx, minZ: z - sz, maxZ: z + sz });
    }
  }
  return {
    player: actor("player", "player", px, pz, project.player.hp, 0, TUNING.PLAYER_SPEED),
    npcs, swords, obstacles,
    heldSwordId: null, pickupLock: null, swingT: 0, swingCd: 0, time: 0,
  };
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function turnToward(a: Actor, dx: number, dz: number, dt: number) {
  const want = Math.atan2(dx, dz);
  let d = want - a.yaw;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  a.yaw += d * Math.min(1, TUNING.TURN * dt);
}

function pushOut(a: Actor, boxes: Box[]) {
  const r = TUNING.ACTOR_RADIUS;
  for (const b of boxes) {
    const cx = clamp(a.x, b.minX, b.maxX);
    const cz = clamp(a.z, b.minZ, b.maxZ);
    const dx = a.x - cx;
    const dz = a.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    if (d2 > 1e-8) {
      const d = Math.sqrt(d2);
      a.x += (dx / d) * (r - d);
      a.z += (dz / d) * (r - d);
    } else {
      const left = a.x - b.minX, right = b.maxX - a.x, back = a.z - b.minZ, front = b.maxZ - a.z;
      const m = Math.min(left, right, back, front);
      if (m === left) a.x = b.minX - r;
      else if (m === right) a.x = b.maxX + r;
      else if (m === back) a.z = b.minZ - r;
      else a.z = b.maxZ + r;
    }
  }
  a.x = clamp(a.x, -TUNING.WORLD_HALF, TUNING.WORLD_HALF);
  a.z = clamp(a.z, -TUNING.WORLD_HALF, TUNING.WORLD_HALF);
}

function moveToward(a: Actor, tx: number, tz: number, dt: number): number {
  const dx = tx - a.x;
  const dz = tz - a.z;
  const d = Math.hypot(dx, dz);
  if (d < 1e-4) return 0;
  const step = Math.min(d, a.speed * dt);
  a.x += (dx / d) * step;
  a.z += (dz / d) * step;
  turnToward(a, dx, dz, dt);
  a.moving = true;
  return d;
}

function wander(a: Actor, dt: number, rand: () => number) {
  if (a.wait > 0) {
    a.wait -= dt;
    return;
  }
  const d = moveToward(a, a.targetX, a.targetZ, dt);
  if (d < 0.3) {
    a.wait = 1 + rand() * 2.5;
    const ang = rand() * Math.PI * 2;
    const rad = 3 + rand() * TUNING.WANDER_RADIUS;
    a.targetX = clamp(a.homeX + Math.cos(ang) * rad, -TUNING.WORLD_HALF, TUNING.WORLD_HALF);
    a.targetZ = clamp(a.homeZ + Math.sin(ang) * rad, -TUNING.WORLD_HALF, TUNING.WORLD_HALF);
  }
}

/** Advances the play simulation. `move` is a world-space XZ vector with length <= 1. */
export function stepPlay(s: PlayState, move: { x: number; z: number }, dt: number, rand: () => number = Math.random) {
  s.time += dt;
  s.swingT = Math.max(0, s.swingT - dt);
  s.swingCd = Math.max(0, s.swingCd - dt);
  const p = s.player;
  p.hitT = Math.max(0, p.hitT - dt);
  p.moving = false;

  if (p.alive) {
    const len = Math.hypot(move.x, move.z);
    if (len > 0.05) {
      const k = Math.min(1, len);
      p.x += (move.x / len) * k * p.speed * dt;
      p.z += (move.z / len) * k * p.speed * dt;
      turnToward(p, move.x, move.z, dt);
      p.moving = true;
    }
    pushOut(p, s.obstacles);
  }

  // Sword pickup / carry
  if (s.pickupLock) {
    const locked = s.swords.find((w) => w.id === s.pickupLock);
    if (!locked || Math.hypot(locked.x - p.x, locked.z - p.z) > TUNING.PICKUP_RADIUS + 0.3) s.pickupLock = null;
  }
  if (!s.heldSwordId && p.alive) {
    const w = s.swords.find(
      (w) => !w.held && w.id !== s.pickupLock && Math.hypot(w.x - p.x, w.z - p.z) < TUNING.PICKUP_RADIUS,
    );
    if (w) {
      w.held = true;
      s.heldSwordId = w.id;
    }
  }
  const held = s.swords.find((w) => w.id === s.heldSwordId);
  if (held) {
    held.x = p.x;
    held.z = p.z;
  }

  for (const n of s.npcs) {
    n.hitT = Math.max(0, n.hitT - dt);
    n.attackCd = Math.max(0, n.attackCd - dt);
    n.moving = false;
    if (!n.alive) continue;
    if (n.role === "monster" && p.alive) {
      const d = Math.hypot(p.x - n.x, p.z - n.z);
      if (d < TUNING.MONSTER_AGGRO) {
        if (d > TUNING.MONSTER_REACH) moveToward(n, p.x, p.z, dt);
        else {
          turnToward(n, p.x - n.x, p.z - n.z, dt);
          if (n.attackCd <= 0) {
            n.attackCd = TUNING.MONSTER_COOLDOWN;
            damageActor(p, n.damage);
          }
        }
        pushOut(n, s.obstacles);
        continue;
      }
    }
    wander(n, dt, rand);
    pushOut(n, s.obstacles);
  }
}

function damageActor(a: Actor, amount: number) {
  if (!a.alive || amount <= 0) return;
  a.hp = Math.max(0, a.hp - amount);
  a.hitT = 0.3;
  if (a.hp <= 0) a.alive = false;
}

export function heldSword(s: PlayState): SwordState | undefined {
  return s.swords.find((w) => w.id === s.heldSwordId);
}

/** Swings the held sword; damages every living NPC within reach. Returns hit ids. */
export function swing(s: PlayState): string[] {
  const w = heldSword(s);
  if (!w || !s.player.alive || s.swingCd > 0) return [];
  s.swingT = TUNING.SWING_TIME;
  s.swingCd = TUNING.SWING_COOLDOWN;
  const hits: string[] = [];
  for (const n of s.npcs) {
    if (!n.alive) continue;
    if (Math.hypot(n.x - s.player.x, n.z - s.player.z) <= TUNING.SWORD_REACH) {
      damageActor(n, w.damage);
      hits.push(n.id);
    }
  }
  return hits;
}

/** Drops the held sword at the player's feet. */
export function dropSword(s: PlayState): boolean {
  const w = heldSword(s);
  if (!w) return false;
  w.held = false;
  w.x = s.player.x;
  w.z = s.player.z;
  s.heldSwordId = null;
  s.pickupLock = w.id;
  return true;
}
