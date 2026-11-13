import { describe, expect, it } from "vitest";
import { makeObject, makeProject } from "../catalog";
import { applyCode, objectsToCode, parseGameCode } from "./codeParser";
import { createPlayState, drinkPotion, dropSword, jump, stepPlay, swing } from "./play";

const proj = () => makeProject("p", "test", 0);

describe("defaults", () => {
  it("player starts with 100 HP", () => {
    expect(proj().player.hp).toBe(100);
  });
  it("a new sword deals 10 damage", () => {
    expect(makeObject("sword", [0, 0, 0]).damage).toBe(10);
  });
});

describe("Code editor", () => {
  it("lists objects with numbered models and sword damage", () => {
    const objs = [
      makeObject("house", [0, 0, 0]),
      makeObject("tree", [0, 0, 0]),
      makeObject("tree", [0, 0, 0]),
      makeObject("sword", [0, 0, 0]),
    ];
    expect(objectsToCode(objs)).toBe("nhà model 1\ncây model 1\ncây model 2\nkiếm model 1 <dame 10>");
  });
  it("editing <dame 123> updates that sword's damage", () => {
    const objs = [makeObject("sword", [0, 0, 0]), makeObject("sword", [0, 0, 0])];
    const res = applyCode(objs, "kiếm model 1 <dame 10>\nkiếm model 2 <dame 123>");
    expect(res.objects[0]!.damage).toBe(10);
    expect(res.objects[1]!.damage).toBe(123);
  });
});

describe("Code Game parser", () => {
  it("creates a civilian NPC with the given HP", () => {
    const r = parseGameCode("-tạo một npc-máu 100\n-dân thường");
    expect(r.commands).toEqual([{ type: "npc", npcType: "civilian", hp: 100, damage: 0 }]);
  });
  it("creates a monster NPC with HP and damage", () => {
    const r = parseGameCode("-tạo một npc-máu [200]\n-quái vật\n+[5] dame");
    expect(r.commands).toEqual([{ type: "npc", npcType: "monster", hp: 200, damage: 5 }]);
  });
  it("creates plain objects", () => {
    const r = parseGameCode("-tạo nhà\n-tạo cây táo\n-tạo đường\n-tạo bụi cây");
    expect(r.commands.map((c) => (c.type === "object" ? c.kind : c.type))).toEqual(["house", "tree", "road", "bush"]);
    expect(r.errors).toHaveLength(0);
  });
});

describe("Play rules", () => {
  it("touching a sword picks it up, swinging hits a nearby NPC, dropping releases it", () => {
    const p = proj();
    p.player.position = [0, 0, 0];
    p.objects = [
      makeObject("sword", [0.5, 0, 0], { damage: 30 }),
      makeObject("npc", [1.5, 0, 0], { npcType: "civilian", hp: 50 }),
    ];
    const s = createPlayState(p);
    s.npcs[0]!.wait = 99;
    stepPlay(s, { x: 0, z: 0 }, 0.016);
    expect(s.heldId).toBe(p.objects[0]!.id);
    swing(s);
    expect(s.npcs[0]!.hp).toBe(20);
    s.swingCd = 0;
    swing(s);
    expect(s.npcs[0]!.alive).toBe(false);
    expect(dropSword(s)).toBe(true);
    expect(s.heldId).toBeNull();
  });
  it("a monster next to the player deals its damage", () => {
    const p = proj();
    p.player.position = [0, 0, 0];
    p.objects = [makeObject("npc", [1, 0, 0], { npcType: "monster", hp: 200, damage: 5 })];
    const s = createPlayState(p);
    stepPlay(s, { x: 0, z: 0 }, 0.016);
    expect(s.player.hp).toBe(95);
  });
});

describe("Blocks, potion, jump", () => {
  it("parses a red vanish block and a white block that costs 10 HP", () => {
    const r = parseGameCode("-tạo block-màu đỏ\n+thêm chức năng=chạm biến mất\n-tạo block-màu trắng\n+thêm chức năng=chạm mất 10 máu");
    expect(r.errors).toHaveLength(0);
    expect(r.commands).toEqual([
      { type: "block", colorName: "đỏ", color: "#c4281c", effect: "vanish" },
      { type: "block", colorName: "trắng", color: "#f2f3f3", effect: "hurt", value: 10 },
    ]);
  });
  it("accepts only the 5 block colors", () => {
    for (const c of ["trắng", "đỏ", "xanh lá", "xanh biển", "đen"]) expect(parseGameCode(`-tạo block-màu ${c}`).errors).toHaveLength(0);
    expect(parseGameCode("-tạo block-màu tím").errors).toHaveLength(1);
  });
  it("a vanish block disappears 3 seconds after it is touched", () => {
    const p = proj();
    p.player.position = [0, 0, 0];
    p.objects = [makeObject("block", [1.2, 0, 0], { effect: "vanish" })];
    const s = createPlayState(p);
    stepPlay(s, { x: 0, z: 0 }, 0.016);
    for (let i = 0; i < 180; i++) stepPlay(s, { x: 0, z: 0 }, 0.016);
    expect(s.blocks[0]!.gone).toBe(false);
    for (let i = 0; i < 10; i++) stepPlay(s, { x: 0, z: 0 }, 0.016);
    expect(s.blocks[0]!.gone).toBe(true);
  });
  it("a hurt block takes 10 HP on touch", () => {
    const p = proj();
    p.player.position = [0, 0, 0];
    p.objects = [makeObject("block", [1.2, 0, 0], { effect: "hurt", effectValue: 10 })];
    const s = createPlayState(p);
    stepPlay(s, { x: 0, z: 0 }, 0.016);
    expect(s.player.hp).toBe(90);
  });
  it("drinking a potion adds 5 run speed", () => {
    const p = proj();
    p.player.position = [0, 0, 0];
    p.objects = [makeObject("potion", [0.3, 0, 0])];
    const s = createPlayState(p);
    stepPlay(s, { x: 0, z: 0 }, 0.016);
    expect(drinkPotion(s)).toBe(true);
    expect(s.player.speed).toBe(11);
  });
  it("jumping lifts the player off the ground", () => {
    const s = createPlayState(proj());
    expect(jump(s)).toBe(true);
    stepPlay(s, { x: 0, z: 0 }, 0.1);
    expect(s.player.y).toBeGreaterThan(0.5);
  });
});
