import { create } from "zustand";
import { makeObject, makeProject } from "./catalog";
import { runtime, viewCenter } from "./runtime";
import { createPlayState } from "./sim/play";
import { getProject, saveProject } from "./storage";
import type { GameObject, ObjKind, Project, Vec3 } from "./types";

export type Gizmo = "none" | "translate" | "scale";

export interface Hud {
  hp: number;
  maxHp: number;
  holding: boolean;
  damage: number;
  dead: boolean;
}

interface StudioState {
  project: Project | null;
  dirty: boolean;
  mode: "edit" | "play";
  session: number;
  selectedId: string | null;
  gizmo: Gizmo;
  hud: Hud;
  load: (id: string) => void;
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
  save: () => void;
  setHud: (h: Partial<Hud>) => void;
}

/** Spawn point near the camera center, nudged so repeated spawns don't overlap exactly. */
export function spawnPoint(spread = 1.5): Vec3 {
  const r = () => (Math.random() - 0.5) * 2 * spread;
  return [+(viewCenter.x + r()).toFixed(2), 0, +(viewCenter.z + r()).toFixed(2)];
}

const emptyHud: Hud = { hp: 100, maxHp: 100, holding: false, damage: 0, dead: false };

export const useStudio = create<StudioState>((set, get) => {
  const patchProject = (fn: (p: Project) => Project) => {
    const p = get().project;
    if (p) set({ project: fn(p), dirty: true });
  };
  return {
    project: null,
    dirty: false,
    mode: "edit",
    session: 0,
    selectedId: null,
    gizmo: "none",
    hud: emptyHud,

    load: (id) => {
      runtime.current = null;
      const saved = getProject(id);
      const now = Date.now();
      const project = saved ?? makeProject(id, `Dự án ${new Date(now).toLocaleDateString("vi-VN")}`, now);
      set({ project, dirty: !saved, mode: "edit", selectedId: null, gizmo: "none", session: get().session + 1 });
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
        hud: { hp: p.player.hp, maxHp: p.player.hp, holding: false, damage: 0, dead: false },
      });
    },
    stop: () => {
      // Edit state was never touched during play, so dropping the runtime restores everything.
      runtime.current = null;
      set({ mode: "edit", session: get().session + 1, hud: emptyHud });
    },
    save: () => {
      const p = get().project;
      if (!p) return;
      const saved = { ...p, updatedAt: Date.now() };
      saveProject(saved);
      set({ project: saved, dirty: false });
    },
    setHud: (h) => set({ hud: { ...get().hud, ...h } }),
  };
});

// Dev-only handle for scripted browser checks (never shipped in production builds).
if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as unknown as { __studio: typeof useStudio }).__studio = useStudio;
}
