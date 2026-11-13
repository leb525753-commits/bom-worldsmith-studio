import type { BlockEffect, GameObject, NpcType, ObjKind, Project, Vec3 } from "./types";

export const DEFAULT_HP = 100;
export const DEFAULT_SWORD_DAMAGE = 10;
export const DEFAULT_MONSTER_DAMAGE = 5;
export const PART_DEFAULT_COLOR = "#a3a2a5";

/** Roblox-like brick palette for the Part color picker. */
export const PART_COLORS = [
  "#a3a2a5", "#f2f3f3", "#1b2a35", "#c4281c", "#da8541", "#f5cd30",
  "#4b974b", "#287f47", "#0d69ac", "#6e99ca", "#6b327c", "#ff66cc",
  "#7c5c46", "#e7c39a",
];

export const KIND_NAME: Record<ObjKind, string> = {
  tree: "Cây táo",
  house: "Nhà",
  road: "Đường",
  bush: "Bụi cây",
  sword: "Kiếm",
  part: "Part",
  npc: "NPC",
  block: "Block",
  house2: "Nhà 2 tầng",
  potion: "Bình thuốc",
};

const DEFAULT_COLOR: Record<ObjKind, string> = {
  tree: "#3f9b3a",
  house: "#efe3c8",
  road: "#5b5d61",
  bush: "#3d8b37",
  sword: "#c9ced6",
  part: PART_DEFAULT_COLOR,
  npc: "#4b974b",
  block: "#f2f3f3",
  house2: "#e8d9bf",
  potion: "#e0457b",
};

/** Approximate top of each model at scale 1, used to place the floating toolbar. */
export const KIND_HEIGHT: Record<ObjKind, number> = {
  tree: 4.4,
  house: 4.6,
  road: 0.4,
  bush: 1.4,
  sword: 0.6,
  part: 1.2,
  npc: 2.9,
  block: 1.2,
  house2: 7.2,
  potion: 0.8,
};

/** The 5 block colors available in Code Game ("-tạo block-màu đỏ"). */
export const BLOCK_COLORS: Record<string, string> = {
  "trắng": "#f2f3f3",
  "đỏ": "#c4281c",
  "xanh lá": "#4b974b",
  "xanh biển": "#0d69ac",
  "đen": "#1c1c1f",
};

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function makeObject(
  kind: ObjKind,
  position: Vec3,
  opts: { id?: string; npcType?: NpcType; hp?: number; damage?: number; color?: string; effect?: BlockEffect | undefined; effectValue?: number | undefined } = {},
): GameObject {
  const obj: GameObject = {
    id: opts.id ?? newId(),
    kind,
    position: [position[0], position[1], position[2]],
    scale: [1, 1, 1],
    color: DEFAULT_COLOR[kind],
  };
  if (opts.color) obj.color = opts.color;
  if (kind === "block" && opts.effect) {
    obj.effect = opts.effect;
    if (opts.effect === "hurt") obj.effectValue = opts.effectValue ?? 10;
  }
  if (kind === "sword") obj.damage = opts.damage ?? DEFAULT_SWORD_DAMAGE;
  if (kind === "npc") {
    obj.npcType = opts.npcType ?? "civilian";
    obj.hp = opts.hp ?? DEFAULT_HP;
    obj.damage = obj.npcType === "monster" ? (opts.damage ?? DEFAULT_MONSTER_DAMAGE) : 0;
    obj.color = obj.npcType === "monster" ? "#7d2a2a" : "#4b974b";
  }
  return obj;
}

export function makeProject(id: string, name: string, now: number): Project {
  return {
    id,
    name,
    createdAt: now,
    updatedAt: now,
    objects: [],
    player: { position: [0, 0, 4], hp: DEFAULT_HP },
    script: "",
  };
}

/** Lowercase label used by the "Code" editor, e.g. "cây model 1". */
export function codeLabel(o: GameObject): string {
  switch (o.kind) {
    case "tree":
      return "cây";
    case "house":
      return "nhà";
    case "road":
      return "đường";
    case "bush":
      return "bụi cây";
    case "sword":
      return "kiếm";
    case "part":
      return "part";
    case "block":
      return "block";
    case "house2":
      return "nhà 2 tầng";
    case "potion":
      return "bình thuốc";
    case "npc":
      return o.npcType === "monster" ? "quái vật" : "npc dân thường";
  }
}

/** Display name for lists, e.g. "Cây táo 2". */
export function displayNames(objects: GameObject[]): Map<string, string> {
  const counts = new Map<string, number>();
  const out = new Map<string, string>();
  for (const o of objects) {
    const base = o.kind === "npc" ? (o.npcType === "monster" ? "Quái vật" : "Dân thường") : KIND_NAME[o.kind];
    const n = (counts.get(base) ?? 0) + 1;
    counts.set(base, n);
    out.set(o.id, `${base} ${n}`);
  }
  return out;
}
