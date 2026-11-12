import type { PlayState } from "./sim/play";

/** Per-frame play state lives outside React; only the HUD values go through the store. */
export const runtime: { current: PlayState | null } = { current: null };

/** Ground point at the center of the edit camera, where new objects spawn. */
export const viewCenter = { x: 0, z: 0 };

export const input = {
  keys: new Set<string>(),
  joy: { x: 0, y: 0 },
  nav: { fwd: 0, back: 0, left: 0, right: 0, up: 0, down: 0 },
};
