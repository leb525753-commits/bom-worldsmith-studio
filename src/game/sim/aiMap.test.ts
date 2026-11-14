import { describe, expect, it } from "vitest";
import { aiMapObjects } from "./aiMap";

describe("AI map builder", () => {
  it("places parts with the requested color and size", () => {
    const { objects } = aiMapObjects({ objects: [{ kind: "part", x: 2, y: 1, z: -3, sx: 4, color: "#c4281c" }] });
    expect(objects).toHaveLength(1);
    expect(objects[0]).toMatchObject({ kind: "part", position: [2, 1, -3], scale: [4, 1, 1], color: "#c4281c" });
  });
  it("drops unknown kinds and keeps objects on the baseplate", () => {
    const { objects } = aiMapObjects({ objects: [{ kind: "dragon", x: 0, z: 0 }, { kind: "tree", x: 500, z: -500 }] });
    expect(objects.map((o) => o.kind)).toEqual(["tree"]);
    expect(objects[0]!.position).toEqual([58, 0, -58]);
  });
  it("monsters made by the AI keep the default 100 HP and 5 dame", () => {
    const { objects } = aiMapObjects({ objects: [{ kind: "monster", x: 0, z: 0 }] });
    expect(objects[0]).toMatchObject({ kind: "npc", npcType: "monster", hp: 100, damage: 5 });
  });
  it("never places more than 200 objects at once", () => {
    const many = Array.from({ length: 300 }, () => ({ kind: "bush", x: 0, z: 0 }));
    expect(aiMapObjects({ objects: many }).objects).toHaveLength(200);
  });
});
