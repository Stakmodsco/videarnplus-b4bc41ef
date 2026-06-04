import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  size?: number;
};

/**
 * VidearnPlus brand mark — flat green tile, crisp "V$" composition.
 * Pure SVG with even-pixel geometry so it renders sharp at any size.
 * No gradients (flat green palette).
 */
export function BrandLogo({ className, size = 40 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="VidearnPlus"
      className={cn("shrink-0", className)}
    >
      {/* Tile */}
      <rect x="2" y="2" width="60" height="60" rx="14" fill="hsl(var(--primary))" />
      <rect
        x="2.5"
        y="2.5"
        width="59"
        height="59"
        rx="13.5"
        fill="none"
        stroke="white"
        strokeOpacity="0.22"
      />

      {/* "V" mark */}
      <path d="M12 16 L24 46 L30 46 L20 16 Z" fill="white" />
      <path d="M30 46 L36 46 L28 28 L25 36 Z" fill="white" fillOpacity="0.85" />

      {/* Dollar tag */}
      <rect x="36" y="20" width="18" height="14" rx="3" fill="white" />
      <text
        x="45"
        y="31"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="12"
        fontWeight="800"
        fill="hsl(var(--primary))"
      >
        $
      </text>
    </svg>
  );
}
