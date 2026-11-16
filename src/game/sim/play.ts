import type { BlockEffect, Project } from "../types";

export const TUNING = {
  PLAYER_SPEED: 6,
  POTION_SPEED_BONUS: 5,
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
  JUMP_SPEED: 9,
  GRAVITY: 26,
  STEP_UP: 0.3,
  VANISH_DELAY: 3,
  HURT_COOLDOWN: 1,
};

export type Role = "player" | "civilian" | "monster";

export interface Actor {
  id: string;
  role: Role;
  x: number;
  y: number;
  z: number;
  vy: number;
  grounded: boolean;
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

export type ItemKind = "sword" | "potion";

export interface ItemState {
  id: string;
  kind: ItemKind;
  x: number;
  z: number;
  damage: number;
  held: boolean;
  /** Potion already drunk. */
  used: boolean;
}

export interface Box {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  base: number;
  top: number;
}

export interface BlockState {
  id: string;
  box: Box;
  effect: BlockEffect | undefined;
  value: number;
  /** Seconds left before a touched vanish-block disappears; -1 = not touched yet. */
  timer: number;
  gone: boolean;
  hurtCd: number;
}

export interface PlayState {
  player: Actor;
  npcs: Actor[];
  items: ItemState[];
  blocks: BlockState[];
  heldId: string | null;
  pickupLock: string | null;
  swingT: number;
  swingCd: number;
  obstacles: Box[];
  time: number;
}

function actor(id: string, role: Role, x: number, z: number, hp: number, damage: number, speed: number): Actor {
  return {
    id, role, x, y: 0, z, vy: 0, grounded: true, yaw: 0, hp, maxHp: hp, damage, alive: hp > 0, speed, moving: false,
    homeX: x, homeZ: z, targetX: x, targetZ: z, wait: 0.5, attackCd: 0, hitT: 0,
  };
}

export function createPlayState(project: Project): PlayState {
  const [px, , pz] = project.player.position;
  const npcs: Actor[] = [];
  const items: ItemState[] = [];
  const blocks: BlockState[] = [];
  const obstacles: Box[] = [];
  for (const o of project.objects) {
    const [x, y, z] = o.position;
    const [sx, sy, sz] = o.scale;
    if (o.kind === "npc") {
      const monster = o.npcType === "monster";
      npcs.push(actor(o.id, monster ? "monster" : "civilian", x, z, o.hp ?? 100, o.damage ?? 0,
        monster ? TUNING.MONSTER_SPEED : TUNING.CIVILIAN_SPEED));
    } else if (o.kind === "sword" || o.kind === "potion") {
      items.push({ id: o.id, kind: o.kind, x, z, damage: o.kind === "sword" ? (o.damage ?? 10) : 0, held: false, used: false });
    } else if (o.kind === "house" || o.kind === "house2") {
      obstacles.push({ minX: x - 2 * sx, maxX: x + 2 * sx, minZ: z - 2 * sz, maxZ: z + 2 * sz, base: -99, top: 99 });
    } else if (o.kind === "part") {
      obstacles.push({ minX: x - sx, maxX: x + sx, minZ: z - sz, maxZ: z + sz, base: y, top: y + sy });
    } else if (o.kind === "block") {
      blocks.push({
        id: o.id,
        box: { minX: x - sx, maxX: x + sx, minZ: z - sz, maxZ: z + sz, base: y, top: y + sy },
        effect: o.effect, value: o.effectValue ?? 10, timer: -1, gone: false, hurtCd: 0,
      });
    }
  }
  return {
    player: actor("player", "player", px, pz, project.player.hp, 0, TUNING.PLAYER_SPEED),
    npcs, items, blocks, obstacles,
    heldId: null, pickupLock: null, swingT: 0, swingCd: 0, time: 0,
  };
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ACTOR_H = 1.8;

function turnToward(a: Actor, dx: number, dz: number, dt: number) {
  const want = Math.atan2(dx, dz);
  let d = want - a.yaw;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  a.yaw += d * Math.min(1, TUNING.TURN * dt);
}

function solids(s: PlayState): Box[] {
  const out = s.obstacles.slice();
  for (const b of s.blocks) if (!b.gone) out.push(b.box);
  return out;
}

function pushOut(a: Actor, boxes: Box[]) {
  const r = TUNING.ACTOR_RADIUS;
  for (const b of boxes) {
    // Standing on top of (or passing over / under) a box never pushes sideways.
    if (a.y >= b.top - 0.05 || a.y + ACTOR_H <= b.base) continue;
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

const over = (a: Actor, b: Box, pad = 0) =>
  a.x > b.minX - pad && a.x < b.maxX + pad && a.z > b.minZ - pad && a.z < b.maxZ + pad;

/** Gravity + landing on the ground or the top of any box under the player. */
function vertical(a: Actor, boxes: Box[], dt: number) {
  let ground = 0;
  for (const b of boxes) if (b.top < 50 && over(a, b, 0.15) && a.y >= b.top - TUNING.STEP_UP) ground = Math.max(ground, b.top);
  a.vy -= TUNING.GRAVITY * dt;
  a.y += a.vy * dt;
  if (a.y <= ground) {
    a.y = ground;
    a.vy = 0;
    a.grounded = true;
  } else a.grounded = false;
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

/** Jumps if the player is standing on something. */
export function jump(s: PlayState): boolean {
  const p = s.player;
  if (!p.alive || !p.grounded) return false;
  p.vy = TUNING.JUMP_SPEED;
  p.grounded = false;
  return true;
}

/** Advances the play simulation. `move` is a world-space XZ vector with length <= 1. */
export function stepPlay(s: PlayState, move: { x: number; z: number }, dt: number, rand: () => number = Math.random) {
  s.time += dt;
  s.swingT = Math.max(0, s.swingT - dt);
  s.swingCd = Math.max(0, s.swingCd - dt);
  const p = s.player;
  p.hitT = Math.max(0, p.hitT - dt);
  p.moving = false;
  const boxes = solids(s);

  if (p.alive) {
    const len = Math.hypot(move.x, move.z);
    if (len > 0.05) {
      const k = Math.min(1, len);
      p.x += (move.x / len) * k * p.speed * dt;
      p.z += (move.z / len) * k * p.speed * dt;
      turnToward(p, move.x, move.z, dt);
      p.moving = true;
    }
    pushOut(p, boxes);
    vertical(p, boxes, dt);
  }

  // Touch blocks
  for (const b of s.blocks) {
    b.hurtCd = Math.max(0, b.hurtCd - dt);
    if (b.gone) continue;
    if (b.timer >= 0) {
      b.timer -= dt;
      if (b.timer <= 0) b.gone = true;
    }
    if (!p.alive || !b.effect) continue;
    const touching = over(p, b.box, TUNING.ACTOR_RADIUS + 0.1) && p.y <= b.box.top + 0.1 && p.y + ACTOR_H >= b.box.base;
    if (!touching) continue;
    if (b.effect === "vanish" && b.timer < 0) b.timer = TUNING.VANISH_DELAY;
    if (b.effect === "hurt" && b.hurtCd <= 0) {
      b.hurtCd = TUNING.HURT_COOLDOWN;
      damageActor(p, b.value);
    }
  }

  // Item pickup / carry
  if (s.pickupLock) {
    const locked = s.items.find((w) => w.id === s.pickupLock);
    if (!locked || Math.hypot(locked.x - p.x, locked.z - p.z) > TUNING.PICKUP_RADIUS + 0.3) s.pickupLock = null;
  }
  if (!s.heldId && p.alive) {
    const w = s.items.find(
      (w) => !w.held && !w.used && w.id !== s.pickupLock && Math.hypot(w.x - p.x, w.z - p.z) < TUNING.PICKUP_RADIUS,
    );
    if (w) {
      w.held = true;
      s.heldId = w.id;
    }
  }
  const held = heldItem(s);
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
          if (n.attackCd <= 0 && p.y < 1.5) {
            n.attackCd = TUNING.MONSTER_COOLDOWN;
            damageActor(p, n.damage);
          }
        }
        pushOut(n, boxes);
        continue;
      }
    }
    wander(n, dt, rand);
    pushOut(n, boxes);
  }
}

function damageActor(a: Actor, amount: number) {
  if (!a.alive || amount <= 0) return;
  a.hp = Math.max(0, a.hp - amount);
  a.hitT = 0.3;
  if (a.hp <= 0) a.alive = false;
}

export function heldItem(s: PlayState): ItemState | undefined {
  return s.items.find((w) => w.id === s.heldId);
}

export function heldSword(s: PlayState): ItemState | undefined {
  const w = heldItem(s);
  return w?.kind === "sword" ? w : undefined;
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

/** Another player in the same room, as seen by this client. */
export interface PlayerTarget {
  id: string;
  x: number;
  z: number;
  alive: boolean;
}

/** True when a swing would happen right now (sword held, alive, not cooling down). */
export function canSwing(s: PlayState): boolean {
  return !!heldSword(s) && s.player.alive && s.swingCd <= 0;
}

/** Other living players close enough to be hit by this player's sword. */
export function playersInReach(s: PlayState, others: PlayerTarget[]): string[] {
  return others
    .filter((o) => o.alive && Math.hypot(o.x - s.player.x, o.z - s.player.z) <= TUNING.SWORD_REACH)
    .map((o) => o.id);
}

/** Damage dealt to this player by another player's sword. */
export function hurtPlayer(s: PlayState, amount: number) {
  if (!Number.isFinite(amount)) return;
  damageActor(s.player, Math.min(1000, Math.max(0, amount)));
}

/** Drops the held item at the player's feet. */
export function dropItem(s: PlayState): boolean {
  const w = heldItem(s);
  if (!w) return false;
  w.held = false;
  w.x = s.player.x;
  w.z = s.player.z;
  s.heldId = null;
  s.pickupLock = w.id;
  return true;
}
export const dropSword = dropItem;

/** Drinks the held potion: +5 run speed, potion is used up. */
export function drinkPotion(s: PlayState): boolean {
  const w = heldItem(s);
  if (!w || w.kind !== "potion" || !s.player.alive) return false;
  w.held = false;
  w.used = true;
  s.heldId = null;
  s.player.speed += TUNING.POTION_SPEED_BONUS;
  return true;
}
