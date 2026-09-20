import { useEffect, useState } from 'react';
import { PauseIcon, PlayIcon, TimerResetIcon } from './icons';

interface MatchDurationProps {
  startedAt: number | null;
  endedAt: number | null;
  pausedAt: number | null;
  totalPausedMs: number;
  onStart: () => void;
  onToggle: () => void;
  onReset: () => void;
  startLabel: string;
  pauseLabel: string;
  resumeLabel: string;
  resetLabel: string;
}

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

/**
 * Chrono de match avec contrôles pause / reprise / reset. Géré comme un
 * composant feuille indépendant : il maintient son propre `now` mis à jour
 * par setInterval pour éviter de re-render tout `MatchView` chaque seconde.
 */
export function MatchDuration({
  startedAt,
  endedAt,
  pausedAt,
  totalPausedMs,
  onStart,
  onToggle,
  onReset,
  startLabel,
  pauseLabel,
  resumeLabel,
  resetLabel,
}: MatchDurationProps) {
  const [now, setNow] = useState(() => Date.now());
  const isPaused = pausedAt !== null;
  const isFinished = endedAt !== null;
  const isRunning = !!startedAt && !isPaused && !isFinished;

  useEffect(() => {
    if (!isRunning) return;
    // rAF pour éviter setState synchrone dans le corps de l'effet ;
    // l'intervalle prend ensuite le relais à 1 Hz.
    const rafId = window.requestAnimationFrame(() => setNow(Date.now()));
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearInterval(id);
    };
  }, [isRunning]);

  /*
   * LE CHRONO SE MONTRE AVANT DE TOURNER, à 0:00.
   *
   * Il ne partait qu'au premier point, et ce composant rendait `null` tant que
   * `startedAt` était vide : il n'existait donc aucun endroit où démarrer la
   * pendule à la main. Or un match commence avant son premier point —
   * échauffement, filet à régler, service manqué. La pastille à 0:00 rend le
   * bouton découvrable là où l'on regardera le temps, et sans déplacer quoi que
   * ce soit dans un pied de page déjà serré.
   */
  const pasDemarre = startedAt === null;
  const cursor = isFinished
    ? (endedAt as number)
    : isPaused
      ? (pausedAt as number)
      : now;
  const elapsed = pasDemarre
    ? 0
    : cursor - (startedAt as number) - totalPausedMs;
  const libelleBascule = pasDemarre
    ? startLabel
    : isPaused
      ? resumeLabel
      : pauseLabel;
  return (
    <span className="ml-2 inline-flex items-center gap-1">
      <span
        aria-live="off"
        className={`inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium tabular-nums ${pasDemarre || isPaused ? 'opacity-60' : 'opacity-90'}`}
      >
        <span aria-hidden>⏱</span>
        {formatDuration(elapsed)}
      </span>
      {!isFinished && (
        <>
          <button
            type="button"
            onClick={pasDemarre ? onStart : onToggle}
            aria-label={libelleBascule}
            title={libelleBascule}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/10"
          >
            {pasDemarre || isPaused ? (
              <PlayIcon size={14} />
            ) : (
              <PauseIcon size={14} />
            )}
          </button>
          {/* Rien à remettre à zéro tant que rien n'a couru : ce bouton
              n'apparaît qu'une fois le chrono lancé. */}
          {!pasDemarre && (
            <button
              type="button"
              onClick={onReset}
              aria-label={resetLabel}
              title={resetLabel}
              className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/10"
            >
              <TimerResetIcon size={14} />
            </button>
          )}
        </>
      )}
    </span>
  );
}
