import { makeObject } from "../catalog";
import type { GameObject, ObjKind, Vec3 } from "../types";

/** Objects the AI map builder may place. */
export const AI_KINDS = ["tree", "house", "house2", "road", "bush", "sword", "potion", "part", "block", "civilian", "monster"] as const;
export type AiKind = (typeof AI_KINDS)[number];

export interface AiMapItem {
  kind: string;
  x: number;
  y?: number;
  z: number;
  sx?: number;
  sy?: number;
  sz?: number;
  color?: string;
}

export const AI_MAP_LIMIT = 200;
const HALF = 58; // baseplate is 120 × 120
const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const r2 = (v: number) => Math.round(v * 100) / 100;

/** Turns the AI's build_map arguments into safe game objects (unknown kinds dropped, values clamped). */
export function aiMapObjects(args: unknown): { clear: boolean; objects: GameObject[] } {
  const a = (args ?? {}) as { clear?: unknown; objects?: unknown };
  const list = Array.isArray(a.objects) ? (a.objects as AiMapItem[]).slice(0, AI_MAP_LIMIT) : [];
  const objects: GameObject[] = [];
  for (const it of list) {
    if (!it || !(AI_KINDS as readonly string[]).includes(it.kind)) continue;
    const kind = it.kind as AiKind;
    const pos: Vec3 = [r2(clamp(num(it.x, 0), -HALF, HALF)), r2(clamp(num(it.y, 0), 0, 60)), r2(clamp(num(it.z, 0), -HALF, HALF))];
    const color = typeof it.color === "string" && /^#[0-9a-f]{6}$/i.test(it.color) ? it.color : undefined;
    const base: ObjKind = kind === "civilian" || kind === "monster" ? "npc" : kind;
    const obj = makeObject(base, pos, {
      npcType: kind === "monster" ? "monster" : kind === "civilian" ? "civilian" : undefined,
      color: base === "part" || base === "block" ? color : undefined,
    });
    obj.scale = [r2(clamp(num(it.sx, 1), 0.2, 30)), r2(clamp(num(it.sy, 1), 0.2, 30)), r2(clamp(num(it.sz, 1), 0.2, 30))];
    objects.push(obj);
  }
  return { clear: a.clear === true, objects };
}
