import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const studioButton = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-[background-color,color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        panel: "bg-secondary text-secondary-foreground hover:bg-accent border border-border",
        primary: "bg-primary text-primary-foreground hover:brightness-110 shadow-glow",
        play: "bg-success text-success-foreground hover:brightness-110",
        stop: "bg-destructive text-destructive-foreground hover:brightness-110",
        ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
        tool: "bg-popover text-popover-foreground hover:bg-accent border border-border",
        toolActive: "bg-primary text-primary-foreground border border-primary",
        danger: "bg-popover text-destructive hover:bg-destructive hover:text-destructive-foreground border border-border",
        action: "rounded-full bg-overlay text-foreground border border-border backdrop-blur-md hover:bg-accent",
      },
      size: {
        sm: "h-8 px-2.5 text-xs",
        md: "h-9 px-3 text-sm",
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-8 text-lg font-semibold",
        icon: "h-8 w-8 p-0",
        round: "h-16 w-16 p-0 text-sm font-semibold",
      },
      block: { true: "w-full justify-start", false: "" },
    },
    defaultVariants: { variant: "panel", size: "md", block: false },
  },
);

export interface StudioButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof studioButton> {}

export const StudioButton = forwardRef<HTMLButtonElement, StudioButtonProps>(
  ({ className, variant, size, block, type = "button", ...props }, ref) => (
    <button ref={ref} type={type} className={cn(studioButton({ variant, size, block }), className)} {...props} />
  ),
);
StudioButton.displayName = "StudioButton";
