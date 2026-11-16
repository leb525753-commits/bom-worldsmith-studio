import { useEffect, useState } from "react";
import { dprFor, parseQuality, type Quality } from "./sim/graphics";

const KEY = "bom-studio.graphics";
const listeners = new Set<() => void>();

export function getQuality(): Quality {
  return parseQuality(typeof localStorage === "undefined" ? null : localStorage.getItem(KEY));
}

export function setQuality(q: Quality) {
  localStorage.setItem(KEY, String(q));
  listeners.forEach((l) => l());
}

export function useQuality(): Quality {
  const [q, setQ] = useState<Quality>(720);
  useEffect(() => {
    const sync = () => setQ(getQuality());
    sync();
    listeners.add(sync);
    return () => void listeners.delete(sync);
  }, []);
  return q;
}

/** Canvas dpr for the chosen graphics quality, updated on resize. */
export function useGraphicsDpr(): number {
  const q = useQuality();
  const [h, setH] = useState(0);
  useEffect(() => {
    const r = () => setH(window.innerHeight);
    r();
    window.addEventListener("resize", r);
    return () => window.removeEventListener("resize", r);
  }, []);
  return dprFor(q, h);
}
