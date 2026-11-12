/** Fullscreen + lock landscape. Browsers only allow this after a tap; iOS Safari does not support locking. */
export async function lockLandscape(): Promise<boolean> {
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    }
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    if (o?.lock) {
      await o.lock("landscape");
      return true;
    }
  } catch {
    /* unsupported */
  }
  return false;
}

/** Try on the first tap anywhere, since a user gesture is required. */
export function autoLockOnFirstTap() {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (!coarse) return () => {};
  const h = () => void lockLandscape();
  window.addEventListener("pointerup", h, { once: true });
  return () => window.removeEventListener("pointerup", h);
}
