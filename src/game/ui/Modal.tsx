import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { StudioButton } from "@/components/studio/StudioButton";

export function Modal({ title, subtitle, onClose, children, footer }: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-3 backdrop-blur-sm" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-popover shadow-float animate-float-in">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">{title}</h2>
            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <StudioButton size="icon" variant="ghost" aria-label="Đóng" onClick={onClose}>
            <X className="h-4 w-4" />
          </StudioButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-2.5">{footer}</div>}
      </div>
    </div>
  );
}
