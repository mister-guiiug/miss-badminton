import { useEffect, useRef, useState } from 'react';

interface SetCountdownProps {
  /** Timestamp du premier point du set (ms). `null` = set non démarré. */
  setStartedAt: number | null;
  /** Durée maximale du set en minutes ; `null` = pas de limite. */
  timeLimitMin: number | null;
  /** Match en pause cumulée (ms) — soustrait du temps écoulé. */
  pausedAccumulatedMs?: number;
  /** Indique que le chrono global est en pause (gel l'affichage). */
  paused?: boolean;
  /** Appelé une seule fois quand le compte à rebours atteint 0. */
  onElapsed: () => void;
}

function format(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Badge décompte pour les sets à durée limitée.
 *
 * Garanties :
 *  - `onElapsed` est appelé AU PLUS UNE FOIS par cycle (entre deux remises à
 *    zéro du `setStartedAt`). Une `firedRef` interne empêche le re-fire lors
 *    d'un re-render ou si l'identité de `onElapsed` change.
 *  - Le ref se relâche quand `setStartedAt` repasse à `null` (nouveau set).
 *  - L'effet écoute `onElapsed` via une ref pour ne pas se re-déclencher si
 *    son identité change (corrige l'ancien `// eslint-disable exhaustive-deps`).
 */
export function SetCountdown({
  setStartedAt,
  timeLimitMin,
  pausedAccumulatedMs = 0,
  paused = false,
  onElapsed,
}: SetCountdownProps) {
  const [now, setNow] = useState(() => Date.now());
  const active = setStartedAt !== null && timeLimitMin !== null && !paused;

  // `onElapsed` est susceptible de changer d'identité entre les renders.
  // On le lit toujours via ref pour ne pas re-déclencher l'effet de fire.
  const onElapsedRef = useRef(onElapsed);
  useEffect(() => {
    onElapsedRef.current = onElapsed;
  }, [onElapsed]);

  // Garde-fou : un seul fire par cycle de set (clé = setStartedAt).
  const firedRef = useRef<number | null>(null);
  useEffect(() => {
    // Au changement de set (nouveau timestamp de départ, ou retour à null),
    // on relâche la garde.
    firedRef.current = null;
  }, [setStartedAt]);

  // Tick à 2 Hz tant que le décompte est actif.
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [active]);

  // Calcul du temps restant (sûr même quand setStartedAt/timeLimitMin sont null).
  const limitMs = (timeLimitMin ?? 0) * 60_000;
  const elapsed =
    setStartedAt === null
      ? 0
      : Math.max(0, now - setStartedAt - pausedAccumulatedMs);
  const remaining = Math.max(0, limitMs - elapsed);
  const finished =
    timeLimitMin !== null && setStartedAt !== null && remaining === 0;

  // Déclenchement unique. Le hook est toujours appelé (rules of hooks) ;
  // la garde `firedRef` protège du double fire.
  useEffect(() => {
    if (!finished) return;
    if (firedRef.current === setStartedAt) return;
    firedRef.current = setStartedAt;
    onElapsedRef.current();
  }, [finished, setStartedAt]);

  if (timeLimitMin === null || setStartedAt === null) return null;

  const warning = remaining < 30_000 && !finished;
  return (
    <span
      role="timer"
      aria-live={warning ? 'assertive' : 'off'}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
        finished
          ? 'bg-red-500/80 text-white'
          : warning
            ? 'bg-amber-400/90 text-black'
            : 'bg-white/10 text-white opacity-90'
      }`}
      title="Time remaining for this set"
    >
      <span aria-hidden>⏳</span>
      {format(remaining)}
    </span>
  );
}
