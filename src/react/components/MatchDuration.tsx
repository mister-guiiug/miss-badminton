import { useEffect, useState } from 'react';
import { PauseIcon, PlayIcon, TimerResetIcon } from './icons';

interface MatchDurationProps {
  startedAt: number | null;
  endedAt: number | null;
  pausedAt: number | null;
  totalPausedMs: number;
  onToggle: () => void;
  onReset: () => void;
  pauseLabel: string;
  resumeLabel: string;
  resetLabel: string;
}

export function formatDuration(ms: number): string {
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
  onToggle,
  onReset,
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

  if (!startedAt) return null;
  const cursor = isFinished ? (endedAt as number) : isPaused ? (pausedAt as number) : now;
  const elapsed = cursor - startedAt - totalPausedMs;
  return (
    <span className="ml-2 inline-flex items-center gap-1">
      <span
        aria-live="off"
        className={`inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium tabular-nums ${isPaused ? 'opacity-60' : 'opacity-90'}`}
      >
        <span aria-hidden>⏱</span>
        {formatDuration(elapsed)}
      </span>
      {!isFinished && (
        <>
          <button
            type="button"
            onClick={onToggle}
            aria-label={isPaused ? resumeLabel : pauseLabel}
            title={isPaused ? resumeLabel : pauseLabel}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/10"
          >
            {isPaused ? <PlayIcon size={14} /> : <PauseIcon size={14} />}
          </button>
          <button
            type="button"
            onClick={onReset}
            aria-label={resetLabel}
            title={resetLabel}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/10"
          >
            <TimerResetIcon size={14} />
          </button>
        </>
      )}
    </span>
  );
}
