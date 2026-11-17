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
  /** Money given each time the player touches this part/block (Code Game "-chạm vô +100 tiền"). */
  touchMoney?: number;
  /** Touching sends the player back to the spawn point. */
  touchTeleport?: boolean;
}

export type MoneySource = "monster" | "civilian" | "player";
export type ShopItemKind = "sword" | "potion";

export interface ShopItem {
  kind: ShopItemKind;
  /** Name as the creator wrote it, e.g. "Thuốc chạy". */
  label: string;
  price: number;
}

/** Money GUI + shop made with Code Game. */
export interface Economy {
  moneyGui: boolean;
  /** Money earned for defeating each kind of target. */
  rewards: Partial<Record<MoneySource, number>>;
  shop: ShopItem[];
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
  economy?: Economy;
}
