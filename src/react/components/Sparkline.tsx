interface SparklineProps {
  /** Suite de valeurs (0..100 par exemple). Au moins 2 points. */
  values: number[];
  width?: number;
  height?: number;
  ariaLabel: string;
  /** Couleur de la ligne ; utilise `currentColor` par défaut. */
  stroke?: string;
}

/**
 * Sparkline SVG inline minimaliste — aucune dépendance.
 * Échelle automatique entre min et max ; remplissage léger sous la courbe.
 */
export function Sparkline({
  values,
  width = 160,
  height = 32,
  ariaLabel,
  stroke = 'currentColor',
}: SparklineProps) {
  if (values.length < 2) return null;
  const lastValue = values.at(-1) ?? 0;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const xStep = width / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = i * xStep;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
  const fillArea = `M0,${height} L${points
    .split(' ')
    .map(p => p.replace(',', ' '))
    .join(' L')} L${width},${height} Z`;

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ overflow: 'visible' }}
    >
      <path d={fillArea} fill={stroke} opacity={0.12} />
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {values.length <= 30 && (
        <circle
          cx={(values.length - 1) * xStep}
          cy={height - ((lastValue - min) / range) * height}
          r={2.5}
          fill={stroke}
        />
      )}
    </svg>
  );
}
