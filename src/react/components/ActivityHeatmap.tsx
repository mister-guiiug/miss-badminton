interface ActivityHeatmapProps {
  /** Timestamps de chaque match joué (ms). */
  timestamps: number[];
  /** Nombre de semaines à afficher (colonnes). Défaut : 12. */
  weeks?: number;
  cell?: number;
  gap?: number;
  ariaLabel: string;
}

const DAYS_PER_WEEK = 7;

/**
 * Heatmap d'activité façon "GitHub contribution graph".
 *
 * - Une colonne = une semaine, une ligne = un jour de la semaine
 * - L'intensité de couleur reflète le nombre de matches joués ce jour-là
 *   (0 → fond, 1 → opacity 0.35, 2 → 0.55, 3+ → 0.85, 5+ → 1)
 * - Pas de tooltip riche : on s'en remet au title HTML natif
 */
export function ActivityHeatmap({
  timestamps,
  weeks = 12,
  cell = 12,
  gap = 3,
  ariaLabel,
}: ActivityHeatmapProps) {
  // Bucketise les timestamps par jour (clé = yyyy-mm-dd).
  const counts = new Map<string, number>();
  for (const ts of timestamps) {
    const d = new Date(ts);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  // Aligne la fin sur "aujourd'hui" pour que la dernière colonne contienne
  // la semaine courante.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = weeks * DAYS_PER_WEEK;
  const cells: { date: Date; key: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    cells.push({ date: d, key, count: counts.get(key) ?? 0 });
  }

  function opacityFor(count: number): number {
    if (count === 0) return 0;
    if (count === 1) return 0.35;
    if (count === 2) return 0.55;
    if (count <= 4) return 0.8;
    return 1;
  }

  const width = weeks * (cell + gap) - gap;
  const height = DAYS_PER_WEEK * (cell + gap) - gap;

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      {cells.map((c, idx) => {
        const col = Math.floor(idx / DAYS_PER_WEEK);
        const row = idx % DAYS_PER_WEEK;
        const x = col * (cell + gap);
        const y = row * (cell + gap);
        return (
          <rect
            key={c.key}
            x={x}
            y={y}
            width={cell}
            height={cell}
            rx={2}
            ry={2}
            fill={c.count === 0 ? 'currentColor' : 'currentColor'}
            opacity={c.count === 0 ? 0.08 : opacityFor(c.count)}
          >
            <title>
              {c.date.toLocaleDateString()} — {c.count} match
              {c.count > 1 ? 'es' : ''}
            </title>
          </rect>
        );
      })}
    </svg>
  );
}
