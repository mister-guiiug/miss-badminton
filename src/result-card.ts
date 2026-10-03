/**
 * Carte résultat « Broadcast » — image PNG carrée générée côté client.
 *
 * Style A des maquettes (`docs/ux-redesign/share-export.html`) : fond sombre,
 * score dominant, pastilles de sets, marque Miss Badminton.
 */

export interface ResultCardInput {
  team1: string;
  team2: string;
  setWins: { team1: number; team2: number };
  setScores: ReadonlyArray<{ team1: number; team2: number }>;
  winner: 'team1' | 'team2';
  durationMs?: number;
  completedAt: number;
  team1Color: string;
  team2Color: string;
  appName: string;
  footer?: string;
  locale?: string;
}

const SIZE = 1080;

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

function formatDate(ts: number, locale = 'fr'): string {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(ts);
  } catch {
    return new Date(ts).toLocaleDateString();
  }
}

function truncate(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) {
    t = t.slice(0, -1);
  }
  return `${t}…`;
}

/**
 * Rend la carte en PNG. Rejette si le canvas n'est pas disponible (tests
 * sans implémentation) — l'appelant bascule alors sur le partage texte.
 */
export function renderResultCardPng(input: ResultCardInput): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas 2D indisponible'));
      return;
    }

    // Fond régie
    const bg = ctx.createLinearGradient(0, 0, SIZE, SIZE);
    bg.addColorStop(0, '#0b0f14');
    bg.addColorStop(1, '#151a22');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Bandes équipe haut
    ctx.fillStyle = input.team1Color;
    ctx.fillRect(0, 0, SIZE / 2, 12);
    ctx.fillStyle = input.team2Color;
    ctx.fillRect(SIZE / 2, 0, SIZE / 2, 12);

    // Marque
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '600 36px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(input.appName, SIZE / 2, 96);

    // Noms
    ctx.font = '700 48px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle =
      input.winner === 'team1' ? '#ffffff' : 'rgba(255,255,255,0.45)';
    ctx.fillText(truncate(ctx, input.team1, 420), 72, 280);
    ctx.textAlign = 'right';
    ctx.fillStyle =
      input.winner === 'team2' ? '#ffffff' : 'rgba(255,255,255,0.45)';
    ctx.fillText(truncate(ctx, input.team2, 420), SIZE - 72, 280);

    // Pastilles couleur sous les noms
    ctx.fillStyle = input.team1Color;
    ctx.fillRect(72, 300, 56, 10);
    ctx.fillStyle = input.team2Color;
    ctx.fillRect(SIZE - 72 - 56, 300, 56, 10);

    // Score sets
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 220px ui-monospace, "Cascadia Mono", monospace';
    const score = `${input.setWins.team1}–${input.setWins.team2}`;
    ctx.fillText(score, SIZE / 2, 560);

    // Sets détail
    const sets = input.setScores
      .map(s => `${s.team1}–${s.team2}`)
      .join('   ·   ');
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '600 40px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(sets || '—', SIZE / 2, 660);

    // Meta
    const metaParts: string[] = [formatDate(input.completedAt, input.locale)];
    if (typeof input.durationMs === 'number') {
      metaParts.push(formatDuration(input.durationMs));
    }
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '500 32px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(metaParts.join('  ·  '), SIZE / 2, 740);

    // Pied
    if (input.footer) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = '500 28px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(
        truncate(ctx, input.footer, SIZE - 120),
        SIZE / 2,
        SIZE - 64
      );
    }

    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error('Échec du rendu PNG'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
}

/**
 * Partage le fichier si la plateforme le permet, sinon déclenche un
 * téléchargement. L'annulation utilisateur n'est pas un échec.
 */
export async function shareOrDownloadPng(
  blob: Blob,
  filename: string,
  title: string
): Promise<'shared' | 'downloaded' | 'cancelled' | 'failed'> {
  const file = new File([blob], filename, { type: 'image/png' });
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };
  if (typeof navigator.share === 'function') {
    const data: ShareData = { files: [file], title };
    const ok = typeof nav.canShare !== 'function' || nav.canShare(data);
    if (ok) {
      try {
        await navigator.share(data);
        return 'shared';
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return 'cancelled';
        }
      }
    }
  }
  try {
    const { downloadBlob } =
      await import('@mister-guiiug/dev-pwa-config/download');
    return downloadBlob(blob, filename) ? 'downloaded' : 'failed';
  } catch {
    return 'failed';
  }
}

/** Exposé pour les tests unitaires. */
export const __test__ = { formatDuration, formatDate, truncate };
