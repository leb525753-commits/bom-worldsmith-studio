import { DEFAULT_HP, DEFAULT_MONSTER_DAMAGE, codeLabel } from "../catalog";
import type { GameObject, NpcType, ObjKind } from "../types";

export type GameCommand =
  | { type: "npc"; npcType: NpcType; hp: number; damage: number }
  | { type: "object"; kind: Exclude<ObjKind, "npc"> };

export interface CodeError {
  line: number;
  text: string;
  message: string;
}

export interface ParseResult {
  commands: GameCommand[];
  errors: CodeError[];
}

const norm = (s: string) => s.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();

const OBJECT_ALIASES: Array<[RegExp, Exclude<ObjKind, "npc">]> = [
  [/^(một )?(cây táo|cây)$/, "tree"],
  [/^(một )?(ngôi )?nhà$/, "house"],
  [/^(một )?(đoạn )?đường$/, "road"],
  [/^(một )?(bụi cây|bụi)$/, "bush"],
  [/^(một )?(thanh )?kiếm$/, "sword"],
  [/^(một )?(part|khối)$/, "part"],
];

const NPC_HEADER = /^-\s*tạo\s+(?:một\s+)?npc(?:\s*-?\s*máu\s*:?\s*\[?\s*(\d+)\s*\]?)?$/;
const CIVILIAN = /^-\s*dân thường$/;
const MONSTER = /^-\s*quái vật$/;
const DAMAGE = /^\+\s*\[?\s*(\d+)\s*\]?\s*(?:dame|damage|dmg)$/;
const CREATE = /^-\s*tạo\s+(.+)$/;

/** Parses the "Code Game" script into spawn commands. */
export function parseGameCode(src: string): ParseResult {
  const commands: GameCommand[] = [];
  const errors: CodeError[] = [];
  let pending: { hp: number; npcType?: NpcType; damage?: number } | null = null;

  const flush = () => {
    if (!pending) return;
    const npcType = pending.npcType ?? "civilian";
    commands.push({
      type: "npc",
      npcType,
      hp: pending.hp,
      damage: npcType === "monster" ? (pending.damage ?? DEFAULT_MONSTER_DAMAGE) : 0,
    });
    pending = null;
  };

  const lines = src.split(/\r?\n/);
  lines.forEach((raw, i): void => {
    const line = norm(raw);
    if (!line || line.startsWith("//") || line.startsWith("#")) return;
    const err = (message: string) => {
      errors.push({ line: i + 1, text: raw.trim(), message });
    };

    let m = line.match(NPC_HEADER);
    if (m) {
      flush();
      pending = { hp: m[1] ? Math.max(1, parseInt(m[1], 10)) : DEFAULT_HP };
      return;
    }
    if (CIVILIAN.test(line) || MONSTER.test(line)) {
      if (!pending) return err("Thiếu dòng “-tạo một npc-máu …” ở phía trên");
      pending.npcType = CIVILIAN.test(line) ? "civilian" : "monster";
      return;
    }
    m = line.match(DAMAGE);
    if (m) {
      if (!pending) return err("Dòng dame phải nằm ngay dưới một NPC");
      pending.damage = parseInt(m[1] ?? "0", 10);
      return;
    }
    m = line.match(CREATE);
    if (m) {
      flush();
      const what = (m[1] ?? "").trim();
      const hit = OBJECT_ALIASES.find(([re]) => re.test(what));
      if (!hit) return err(`Không biết vật thể “${what}”`);
      commands.push({ type: "object", kind: hit[1] });
      return;
    }
    err("Không hiểu dòng lệnh này");
  });
  flush();
  return { commands, errors };
}

/** Lists every object in the "Code" editor format. */
export function objectsToCode(objects: GameObject[]): string {
  const counts = new Map<string, number>();
  return objects
    .map((o) => {
      const label = codeLabel(o);
      const n = (counts.get(label) ?? 0) + 1;
      counts.set(label, n);
      let line = `${label} model ${n}`;
      if (o.kind === "npc") line += ` <máu ${o.hp ?? DEFAULT_HP}>`;
      if (o.kind === "sword" || (o.kind === "npc" && o.npcType === "monster")) line += ` <dame ${o.damage ?? 0}>`;
      return line;
    })
    .join("\n");
}

export interface ApplyResult {
  objects: GameObject[];
  changed: number;
  errors: CodeError[];
}

const LINE = /^(.+?)\s+model\s+(\d+)\s*(.*)$/;
const TAG_DAME = /<\s*dame\s*:?\s*(-?\d+)\s*>/;
const TAG_HP = /<\s*máu\s*:?\s*(\d+)\s*>/;

/** Applies edited <dame N> / <máu N> values from the "Code" editor back to objects. */
export function applyCode(objects: GameObject[], text: string): ApplyResult {
  const byLabel = new Map<string, number[]>();
  objects.forEach((o, idx) => {
    const l = codeLabel(o);
    byLabel.set(l, [...(byLabel.get(l) ?? []), idx]);
  });
  const next = objects.map((o) => ({ ...o }));
  const errors: CodeError[] = [];
  let changed = 0;

  text.split(/\r?\n/).forEach((raw, i): void => {
    const line = norm(raw);
    if (!line) return;
    const m = line.match(LINE);
    if (!m) {
      errors.push({ line: i + 1, text: raw.trim(), message: "Sai cú pháp" });
      return;
    }
    const list = byLabel.get(m[1] ?? "");
    const idx = list?.[parseInt(m[2] ?? "0", 10) - 1];
    const o = idx === undefined ? undefined : next[idx];
    if (!o) {
      errors.push({ line: i + 1, text: raw.trim(), message: "Không tìm thấy vật thể này" });
      return;
    }
    const tags = m[3] ?? "";
    const d = tags.match(TAG_DAME);
    if (d && (o.kind === "sword" || o.kind === "npc")) {
      const v = Math.max(0, parseInt(d[1] ?? "0", 10));
      if (v !== o.damage) {
        o.damage = v;
        changed++;
      }
    }
    const h = tags.match(TAG_HP);
    if (h && o.kind === "npc") {
      const v = Math.max(1, parseInt(h[1] ?? "1", 10));
      if (v !== o.hp) {
        o.hp = v;
        changed++;
      }
    }
  });
  return { objects: next, changed, errors };
}
