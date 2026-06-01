import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  size?: number;
  /** Premium tier shows extra inner sheen + ring. Defaults to true. */
  premium?: boolean;
};

/**
 * Theme-aware brand mark. Uses semantic tokens (primary / accent) so it
 * automatically restyles for light/dark mode and any future palette change.
 * Composition: stylised "V" + dollar bill stack — same silhouette as the
 * source artwork, but rebuilt as crisp SVG with gradient + sheen for a
 * premium glassy finish.
 */
export function BrandLogo({ className, size = 40, premium = true }: Props) {
  const id = "brand-logo";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Videarnplus"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id={`${id}-mark`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.95" />
          <stop offset="100%" stopColor="white" stopOpacity="0.78" />
        </linearGradient>
      </defs>

      {/* tile — flat brand green, no gradient */}
      <rect x="2" y="2" width="60" height="60" rx="14" fill="hsl(var(--primary))" />
      {premium && (
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
      )}
      <rect x="2" y="2" width="60" height="30" rx="14" fill={`url(#${id}-glow)`} />

      {/* "V" mark */}
      <path
        d="M12 17 L24.5 47 L31 47 L21.5 17 Z"
        fill={`url(#${id}-mark)`}
      />
      <path
        d="M31 47 L37.5 47 L29.5 27 L26.2 35 Z"
        fill="white"
        fillOpacity="0.85"
      />

      {/* Dollar bill stack */}
      <g>
        <rect x="34" y="22" width="20" height="14" rx="2" fill="white" fillOpacity="0.18" />
        <rect x="36" y="20" width="20" height="14" rx="2" fill="white" fillOpacity="0.92" />
        <text
          x="46"
          y="31"
          textAnchor="middle"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fontSize="11"
          fontWeight="800"
          fill="var(--primary)"
        >
          $
        </text>
      </g>

      {/* top sheen */}
      <rect x="4" y="4" width="56" height="22" rx="12" fill={`url(#${id}-sheen)`} />
    </svg>
  );
}
