export type ObjKind = "tree" | "house" | "road" | "bush" | "sword" | "part" | "npc" | "block" | "house2" | "potion";
export type BlockEffect = "vanish" | "hurt";
export type NpcType = "civilian" | "monster";
export type Vec3 = [number, number, number];

export interface GameObject {
  id: string;
  kind: ObjKind;
  position: Vec3;
  scale: Vec3;
  color: string;
  /** Sword damage, or monster damage per hit. */
  damage?: number;
  /** NPC hit points. */
  hp?: number;
  npcType?: NpcType;
  /** Block touch behaviour (Code Game). */
  effect?: BlockEffect;
  /** HP lost per touch for "hurt" blocks. */
  effectValue?: number;
}

export interface PlayerSpawn {
  position: Vec3;
  hp: number;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  objects: GameObject[];
  player: PlayerSpawn;
  script?: string;
}
