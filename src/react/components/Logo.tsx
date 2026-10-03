import { useId } from 'react';

interface LogoProps {
  /** Taille en px (largeur = hauteur, pour préserver le ratio 1:1). */
  size?: number;
  /** Étiquette accessible. Si vide, le SVG est décoratif. */
  ariaLabel?: string;
  className?: string;
}

/**
 * Logo « Miss Badminton » — la raquette, le cordage, et le volant à l'impact.
 *
 * LE MÊME TRACÉ QUE `public/logo.svg`, inline pour être posé dans un en-tête
 * sans requête HTTP. Les deux fichiers doivent bouger ensemble : celui-ci pour
 * l'écran, l'autre pour les icônes du manifeste (`npm run icons`).
 *
 * DEUX DENSITÉS, UN SEUL DESSIN. Sous 32 px, le cordage — dix traits d'un
 * pixel — ne fait plus qu'un gris sale au milieu du tamis : il disparaît, le
 * trait épaissit et le volant grossit d'un tiers. C'est la même règle que
 * `public/favicon.svg` applique pour l'onglet, appliquée ici à l'en-tête et au
 * tiroir, qui demandent 24 à 32 px.
 *
 * LES `id` VIENNENT DE `useId`, PAS DE `size`. Deux logos de même taille sur
 * une page — l'en-tête et le tiroir en portent un chacun — produisaient deux
 * dégradés du même identifiant : le navigateur garde le premier, et le second
 * logo héritait silencieusement des couleurs de son voisin. Avec `useId`,
 * chaque instance a les siennes.
 */
export function Logo({ size = 32, ariaLabel, className }: LogoProps) {
  const decorative = !ariaLabel;
  const uid = useId().replace(/:/g, '');
  const dense = size >= 32;
  const fond = `mb-logo-bg-${uid}`;
  const tamis = `mb-logo-tamis-${uid}`;
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
        <linearGradient id={fond} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <clipPath id={tamis}>
          <ellipse cx="32" cy="24" rx="11" ry="13.5" />
        </clipPath>
      </defs>

      <rect width="64" height="64" rx="16" fill={`url(#${fond})`} />

      <g transform="rotate(-20 32 32)">
        <ellipse
          cx="32"
          cy="25"
          rx="13.5"
          ry="15.5"
          fill="none"
          stroke="#ffffff"
          strokeWidth={dense ? 4 : 5}
        />
        {dense ? (
          <g
            stroke="#ffffff"
            strokeOpacity="0.45"
            strokeWidth="1"
            clipPath={`url(#${tamis})`}
          >
            <path d="M 24 9 V 39" />
            <path d="M 28 9 V 39" />
            <path d="M 32 9 V 39" />
            <path d="M 36 9 V 39" />
            <path d="M 40 9 V 39" />
            <path d="M 19 14 H 45" />
            <path d="M 19 19 H 45" />
            <path d="M 19 24 H 45" />
            <path d="M 19 29 H 45" />
            <path d="M 19 34 H 45" />
          </g>
        ) : null}
        <path
          d="M 32 40 V 49"
          stroke="#ffffff"
          strokeWidth={dense ? 6 : 7}
          strokeLinecap="round"
        />

        <g transform={`translate(32 24) scale(${dense ? 0.4 : 0.55})`}>
          <path
            d="M -0.74 -4.32 L -10.1 -22.13 L -16.74 -17.66 L -3.73 -2.31 Z"
            fill="#ffffff"
          />
          <path d="M 1.8 -4 L 4 -24 L -4 -24 L -1.8 -4 Z" fill="#ffffff" />
          <path
            d="M 3.73 -2.31 L 16.74 -17.66 L 10.1 -22.13 L 0.74 -4.32 Z"
            fill="#ffffff"
          />
          <circle cx="0" cy="4" r="8" fill="#fbbf24" />
        </g>
      </g>
    </svg>
  );
}
