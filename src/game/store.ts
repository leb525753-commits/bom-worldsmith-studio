import { create } from "zustand";
import { makeObject } from "./catalog";
import { runtime, viewCenter } from "./runtime";
import { createPlayState, type ItemKind } from "./sim/play";
import type { Account } from "./accounts";
import { saveProject } from "./storage";
import type { GameObject, ObjKind, Project, Vec3 } from "./types";

export type Gizmo = "none" | "translate" | "scale";

export interface Hud {
  hp: number;
  maxHp: number;
  holding: ItemKind | null;
  speed: number;
  damage: number;
  dead: boolean;
}

interface StudioState {
  project: Project | null;
  account: Account | null;
  dirty: boolean;
  mode: "edit" | "play";
  session: number;
  selectedId: string | null;
  gizmo: Gizmo;
  hud: Hud;
  open: (project: Project, isNew: boolean, account: Account) => void;
  rename: (name: string) => void;
  setScript: (script: string) => void;
  spawn: (kind: ObjKind, opts?: Parameters<typeof makeObject>[2]) => GameObject;
  spawnMany: (objs: GameObject[]) => void;
  update: (id: string, patch: Partial<GameObject>) => void;
  setObjects: (objs: GameObject[]) => void;
  remove: (id: string) => void;
  select: (id: string | null) => void;
  setGizmo: (g: Gizmo) => void;
  play: () => void;
  stop: () => void;
  save: () => Promise<void>;
  setHud: (h: Partial<Hud>) => void;
}

/** Spawn point near the camera center, nudged so repeated spawns don't overlap exactly. */
export function spawnPoint(spread = 1.5): Vec3 {
  const r = () => (Math.random() - 0.5) * 2 * spread;
  return [+(viewCenter.x + r()).toFixed(2), 0, +(viewCenter.z + r()).toFixed(2)];
}

const emptyHud: Hud = { hp: 100, maxHp: 100, holding: null, speed: 6, damage: 0, dead: false };

export const useStudio = create<StudioState>((set, get) => {
  const patchProject = (fn: (p: Project) => Project) => {
    const p = get().project;
    if (p) set({ project: fn(p), dirty: true });
  };
  return {
    project: null,
    account: null,
    dirty: false,
    mode: "edit",
    session: 0,
    selectedId: null,
    gizmo: "none",
    hud: emptyHud,

    open: (project, isNew, account) => {
      runtime.current = null;
      set({ project, account, dirty: isNew, mode: "edit", selectedId: null, gizmo: "none", session: get().session + 1 });
    },
    rename: (name) => patchProject((p) => ({ ...p, name })),
    setScript: (script) => patchProject((p) => ({ ...p, script })),
    spawn: (kind, opts) => {
      const obj = makeObject(kind, spawnPoint(kind === "road" ? 0 : 1.5), opts);
      patchProject((p) => ({ ...p, objects: [...p.objects, obj] }));
      set({ selectedId: obj.id, gizmo: "none" });
      return obj;
    },
    spawnMany: (objs) => patchProject((p) => ({ ...p, objects: [...p.objects, ...objs] })),
    update: (id, patch) =>
      patchProject((p) => ({ ...p, objects: p.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)) })),
    setObjects: (objects) => patchProject((p) => ({ ...p, objects })),
    remove: (id) => {
      patchProject((p) => ({ ...p, objects: p.objects.filter((o) => o.id !== id) }));
      if (get().selectedId === id) set({ selectedId: null, gizmo: "none" });
    },
    select: (id) => set({ selectedId: id, gizmo: "none" }),
    setGizmo: (gizmo) => set({ gizmo }),

    play: () => {
      const p = get().project;
      if (!p) return;
      runtime.current = createPlayState(p);
      set({
        mode: "play",
        selectedId: null,
        gizmo: "none",
        session: get().session + 1,
        hud: { ...emptyHud, hp: p.player.hp, maxHp: p.player.hp },
      });
    },
    stop: () => {
      // Edit state was never touched during play, so dropping the runtime restores everything.
      runtime.current = null;
      set({ mode: "edit", session: get().session + 1, hud: emptyHud });
    },
    save: async () => {
      const { project: p, account } = get();
      if (!p || !account) return;
      const saved = { ...p, updatedAt: Date.now() };
      await saveProject(saved, account);
      set({ project: saved, dirty: false });
    },
    setHud: (h) => set({ hud: { ...get().hud, ...h } }),
  };
});

// Dev-only handle for scripted browser checks (never shipped in production builds).
if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as unknown as { __studio: typeof useStudio }).__studio = useStudio;
}
