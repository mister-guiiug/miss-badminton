interface LogoProps {
  /** Taille en px (largeur = hauteur, pour préserver le ratio 1:1). */
  size?: number;
  /** Étiquette accessible. Si vide, le SVG est décoratif. */
  ariaLabel?: string;
  className?: string;
}

/**
 * Logo "Miss Badminton" — volant en éventail sur fond indigo dégradé.
 * Réutilise le même tracé que `public/logo.svg` mais inline pour pouvoir
 * être posé dans des en-têtes sans requête HTTP.
 */
export function Logo({ size = 32, ariaLabel, className }: LogoProps) {
  const decorative = !ariaLabel;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role={decorative ? 'presentation' : 'img'}
      aria-label={ariaLabel}
      aria-hidden={decorative || undefined}
      className={className}
    >
      <defs>
        <linearGradient id={`mb-logo-bg-${size}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient
          id={`mb-logo-feath-${size}`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
        <radialGradient id={`mb-logo-cork-${size}`} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#f59e0b" />
        </radialGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill={`url(#mb-logo-bg-${size})`} />
      <path
        d="M 6 52 Q 24 12 58 10"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="1.5 4"
      />
      <g transform="rotate(-22 32 34)">
        <g
          fill={`url(#mb-logo-feath-${size})`}
          stroke="#94a3b8"
          strokeWidth="0.7"
          strokeLinejoin="round"
        >
          <path d="M 32 40 L 18 16 L 23 14 Z" />
          <path d="M 32 40 L 25 12 L 30 11 Z" />
          <path d="M 32 40 L 30 10 L 34 10 Z" />
          <path d="M 32 40 L 34 11 L 39 12 Z" />
          <path d="M 32 40 L 41 14 L 46 16 Z" />
        </g>
        <ellipse
          cx="32"
          cy="40"
          rx="9"
          ry="2.5"
          fill="none"
          stroke="rgba(100,116,139,0.6)"
          strokeWidth="0.7"
        />
        <ellipse
          cx="32"
          cy="46"
          rx="7"
          ry="6"
          fill={`url(#mb-logo-cork-${size})`}
          stroke="#b45309"
          strokeWidth="1.2"
        />
        <ellipse
          cx="29"
          cy="43"
          rx="2.5"
          ry="1.4"
          fill="rgba(255,255,255,0.65)"
        />
      </g>
    </svg>
  );
}
