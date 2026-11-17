import { BLOCK_COLORS, DEFAULT_HP, DEFAULT_MONSTER_DAMAGE, codeLabel } from "../catalog";
import type { BlockEffect, GameObject, MoneySource, NpcType, ObjKind, ShopItem } from "../types";

/** Extra touch behaviour that "-chạm vô …" lines add to the part/block above them. */
export interface TouchOpts {
  touchMoney?: number;
  touchTeleport?: boolean;
}

export type GameCommand =
  | { type: "npc"; npcType: NpcType; hp: number; damage: number }
  | ({ type: "block"; colorName: string; color: string; effect?: BlockEffect; value?: number } & TouchOpts)
  | ({ type: "object"; kind: Exclude<ObjKind, "npc" | "block"> } & TouchOpts)
  | { type: "moneyGui"; rewards: Partial<Record<MoneySource, number>> }
  | { type: "shop"; items: ShopItem[] }
  | { type: "removeGui"; gui: "money" | "shop" };

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

const OBJECT_ALIASES: Array<[RegExp, Exclude<ObjKind, "npc" | "block">]> = [
  [/^(một )?(ngôi )?nhà 2 tầng$/, "house2"],
  [/^(một )?(bình thuốc|thuốc)$/, "potion"],
  [/^(một )?(cây táo|cây)$/, "tree"],
  [/^(một )?(ngôi )?nhà$/, "house"],
  [/^(một )?(đoạn )?đường$/, "road"],
  [/^(một )?(bụi cây|bụi)$/, "bush"],
  [/^(một )?(thanh )?kiếm$/, "sword"],
  [/^(một )?(khối )?(part|khối)$/, "part"],
];

const NPC_HEADER = /^-\s*tạo\s+(?:một\s+)?npc(?:\s*-?\s*máu\s*:?\s*\[?\s*(\d+)\s*\]?)?$/;
const CIVILIAN = /^-\s*dân thường$/;
const MONSTER = /^-\s*quái vật$/;
const DAMAGE = /^\+\s*\[?\s*(\d+)\s*\]?\s*(?:dame|damage|dmg)$/;
const BLOCK = /^-\s*tạo\s+(?:một\s+)?block(?:\s*-?\s*màu\s*:?\s*(.*))?$/;
const FEATURE = /^\+\s*thêm\s+chức\s+năng\s*[=:]?\s*(.+)$/;
const CREATE = /^-\s*tạo\s+(.+)$/;
const MONEY_GUI = /^-\s*tạo\s+gui\s+tiền$/;
const SHOP_GUI = /^-\s*tạo\s+gui\s+shop$/;
const REMOVE_GUI = /^-\s*xóa\s+gui\s+(tiền|shop)$/;
const REWARD = /^-\s*(quái vật|dân thường|người chơi)\s*\+\s*\[?\s*(\d+)\s*\]?\s*(?:tiền)?$/;
const SHOP_LINE = /^-\s*(.+?)\s*[:=]?\s*\[?\s*(\d+)\s*\]?\s*tiền$/;
const TOUCH = /^[-+]\s*chạm\s*(?:vô|vào)?\s*(.*)$/;
const SOURCE: Record<string, MoneySource> = { "quái vật": "monster", "dân thường": "civilian", "người chơi": "player" };

/** Shop item names the game knows how to sell. */
function shopKind(name: string): ShopItem["kind"] | null {
  if (/^(thanh )?kiếm/.test(name)) return "sword";
  if (/^(bình )?thuốc/.test(name)) return "potion";
  return null;
}

/** Parses the "Code Game" script into spawn commands. */
export function parseGameCode(src: string): ParseResult {
  const commands: GameCommand[] = [];
  const errors: CodeError[] = [];
  let pending: { hp: number; npcType?: NpcType; damage?: number } | null = null;
  let block: Extract<GameCommand, { type: "block" }> | null = null;
  /** Last "-tạo part" command, so "-chạm vô …" lines can attach to it. */
  let part: Extract<GameCommand, { type: "object" }> | null = null;
  let section: Extract<GameCommand, { type: "moneyGui" }> | Extract<GameCommand, { type: "shop" }> | null = null;

  const flush = () => {
    if (block) commands.push(block);
    block = null;
    part = null;
    section = null;
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

    if (MONEY_GUI.test(line) || SHOP_GUI.test(line)) {
      flush();
      section = MONEY_GUI.test(line) ? { type: "moneyGui", rewards: {} } : { type: "shop", items: [] };
      commands.push(section);
      return;
    }
    let m = line.match(REMOVE_GUI);
    if (m) {
      flush();
      commands.push({ type: "removeGui", gui: m[1] === "shop" ? "shop" : "money" });
      return;
    }
    m = line.match(TOUCH);
    if (m) {
      const target = block ?? part;
      if (!target) return err("Dòng “-chạm vô …” phải nằm ngay dưới “-tạo part” hoặc “-tạo block”");
      const what = m[1] ?? "";
      const money = what.match(/\+\s*\[?\s*(\d+)\s*\]?\s*tiền/);
      const tele = /dịch\s*chuyển/.test(what);
      if (!money && !tele) return err("Dùng “-chạm vô +100 tiền” hoặc “-chạm vô dịch chuyển về nơi spawn”");
      if (money) target.touchMoney = parseInt(money[1] ?? "0", 10);
      if (tele) target.touchTeleport = true;
      return;
    }
    if (section?.type === "moneyGui") {
      m = line.match(REWARD);
      if (m) {
        const src = SOURCE[m[1] ?? ""];
        if (src) section.rewards[src] = parseInt(m[2] ?? "0", 10);
        return;
      }
    }
    if (section?.type === "shop" && !CREATE.test(line)) {
      m = line.match(SHOP_LINE);
      const name = (m?.[1] ?? "").replace(/[[\]()]/g, "").trim();
      const kind = shopKind(name);
      if (!m || !kind) return err("Shop chỉ bán “kiếm” hoặc “thuốc chạy”, ví dụ: -kiếm 100 tiền");
      section.items.push({ kind, label: name.charAt(0).toUpperCase() + name.slice(1), price: parseInt(m[2] ?? "0", 10) });
      return;
    }

    m = line.match(BLOCK);
    if (m) {
      flush();
      const name = (m[1] ?? "trắng").replace(/[[\]{}<>()]/g, "").trim() || "trắng";
      const color = BLOCK_COLORS[name];
      if (!color) return err(`Màu “${name}” không có. Chọn: trắng, đỏ, xanh lá, xanh biển, đen`);
      block = { type: "block", colorName: name, color };
      return;
    }
    m = line.match(FEATURE);
    if (m) {
      if (!block) return err("Dòng “+thêm chức năng” phải nằm ngay dưới “-tạo block”");
      const f = (m[1] ?? "").replace(/[{}<>[\]]/g, " ").replace(/\s+/g, " ");
      const hurt = f.match(/chạm\s+(?:là\s+)?mất\s+(\d+)\s*máu/);
      if (hurt) {
        block.effect = "hurt";
        block.value = parseInt(hurt[1] ?? "10", 10);
      } else if (/chạm\s+(?:là\s+)?biến\s+mất/.test(f)) block.effect = "vanish";
      else return err("Chức năng chưa hỗ trợ. Dùng “chạm biến mất” hoặc “chạm mất 10 máu”");
      return;
    }
    m = line.match(NPC_HEADER);
    if (m) {
      flush();
      pending = { hp: m[1] ? Math.max(1, parseInt(m[1], 10)) : DEFAULT_HP };
      return;
    }
    if (section?.type === "moneyGui" && (CIVILIAN.test(line) || MONSTER.test(line) || /^-\s*người chơi$/.test(line))) {
      return err("Thiếu số tiền, ví dụ: -quái vật +100");
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
      const cmd: Extract<GameCommand, { type: "object" }> = { type: "object", kind: hit[1] };
      commands.push(cmd);
      if (hit[1] === "part") part = cmd;
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
