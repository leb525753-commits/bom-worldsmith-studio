import { useEffect } from "react";
import { input, runtime } from "../runtime";
import { useStudio } from "../store";
import { doDrink, doDrop, doJump, doSwing } from "./Overlays";

export function useKeyboard() {
  useEffect(() => {
    const isTyping = (t: EventTarget | null) =>
      t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    const down = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
      input.keys.add(e.code);
      const st = useStudio.getState();
      if (st.mode === "play" && runtime.current) {
        if (e.code === "Space" && !e.repeat) doJump();
        if (e.code === "KeyJ" || e.code === "KeyF") doSwing();
        if (e.code === "KeyE" && !e.repeat) doDrink();
        if (e.code === "KeyG" || (e.code === "KeyQ" && !e.repeat)) doDrop();
      } else if (e.code === "Escape") st.select(null);
      else if ((e.code === "Delete" || e.code === "Backspace") && st.selectedId) st.remove(st.selectedId);
    };
    const up = (e: KeyboardEvent) => input.keys.delete(e.code);
    const clear = () => input.keys.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
    };
  }, []);
}
