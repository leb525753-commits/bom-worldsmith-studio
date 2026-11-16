import { Check, MonitorCog } from "lucide-react";
import { setQuality, useQuality } from "../graphics";
import { QUALITIES } from "../sim/graphics";
import { Modal } from "./Modal";

const HINT: Record<number, string> = { 1080: "Nét nhất, máy mạnh", 720: "Cân bằng", 480: "Mượt nhất, máy yếu" };

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const q = useQuality();
  return (
    <Modal title="Cài đặt" subtitle="Đồ hoạ khi làm và chơi game" onClose={onClose}>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <MonitorCog className="h-3.5 w-3.5" /> Đồ hoạ
      </p>
      <div className="grid grid-cols-3 gap-2">
        {QUALITIES.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setQuality(v)}
            aria-pressed={q === v}
            className={`relative rounded-lg border p-3 text-center transition-colors hover:border-primary ${q === v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary"}`}
          >
            {q === v && <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5" />}
            <span className="block text-lg font-extrabold">{v}p</span>
            <span className={`block text-[11px] ${q === v ? "" : "text-muted-foreground"}`}>{HINT[v]}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
