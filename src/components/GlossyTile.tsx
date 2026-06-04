import * as React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Variant = "primary" | "warning" | "success" | "muted" | "danger";
type Size = "sm" | "md" | "lg";

interface GlossyTileProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon;
  variant?: Variant;
  size?: Size;
  locked?: boolean;
}

const SIZE_MAP: Record<Size, { box: string; icon: string; radius: string }> = {
  sm: { box: "h-9 w-9", icon: "h-4 w-4", radius: "rounded-lg" },
  md: { box: "h-12 w-12", icon: "h-5 w-5", radius: "rounded-xl" },
  lg: { box: "h-16 w-16", icon: "h-7 w-7", radius: "rounded-2xl" },
};

// Variant colours are driven by CSS tokens from index.css so light/dark themes
// just work. These map to the VidearnPlus indigo/violet palette.
// Flat solid fills — no color gradients (brand green palette).
const VARIANT_MAP: Record<Variant, { bg: string; ring: string; iconCls: string }> = {
  primary: { bg: "bg-primary", ring: "ring-primary/40", iconCls: "text-primary-foreground" },
  warning: { bg: "bg-warning", ring: "ring-warning/40", iconCls: "text-warning-foreground" },
  success: { bg: "bg-success", ring: "ring-success/40", iconCls: "text-primary-foreground" },
  muted:   { bg: "bg-muted",   ring: "ring-border",     iconCls: "text-muted-foreground" },
  danger:  { bg: "bg-destructive", ring: "ring-destructive/40", iconCls: "text-destructive-foreground" },
};

/**
 * GlossyTile — a reusable "premium 3D" icon tile inspired by the Zerion
 * design language. It uses a layered gradient + inner highlight + soft
 * outer shadow purely with CSS so it themes correctly in light/dark mode
 * and never ships an extra image asset.
 */
export const GlossyTile = React.forwardRef<HTMLDivElement, GlossyTileProps>(
  ({ icon: Icon, variant = "primary", size = "md", locked = false, className, ...rest }, ref) => {
    const s = SIZE_MAP[size];
    const v = VARIANT_MAP[locked ? "muted" : variant];
    return (
      <div
        ref={ref}
        className={cn(
          "relative grid place-items-center shrink-0 select-none",
          s.box,
          s.radius,
          v.bg,
          "ring-1",
          v.ring,
          "shadow-[0_8px_22px_-12px_hsl(var(--primary)/0.4)]",
          "transition-transform duration-300 ease-out",
          locked && "opacity-60 grayscale",
          className,
        )}
        {...rest}
      >
        <Icon className={cn(s.icon, v.iconCls, "relative")} />
      </div>
    );
  },
);
GlossyTile.displayName = "GlossyTile";
