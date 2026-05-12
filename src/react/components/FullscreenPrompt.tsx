import { useEffect, useState } from 'react';

const DISMISSED_KEY = 'mb_fs_prompt_dismissed';

interface OrientationLock {
  lock?: (orientation: 'landscape') => Promise<void>;
}

function computeNeedsPrompt(): boolean {
  if (typeof window === 'undefined') return false;
  if (sessionStorage.getItem(DISMISSED_KEY) === '1') return false;
  const isFullscreen = !!document.fullscreenElement;
  const isPortrait = window.matchMedia('(orientation: portrait)').matches;
  const isCoarse = window.matchMedia(
    '(hover: none) and (pointer: coarse)'
  ).matches;
  const isNarrow = window.matchMedia('(max-width: 1024px)').matches;
  return (isCoarse || isNarrow) && (!isFullscreen || isPortrait);
}

export function FullscreenPrompt() {
  const [visible, setVisible] = useState<boolean>(() => computeNeedsPrompt());

  useEffect(() => {
    const refresh = () => setVisible(computeNeedsPrompt());
    const mqOrient = window.matchMedia('(orientation: portrait)');
    const mqSize = window.matchMedia('(max-width: 1024px)');
    mqOrient.addEventListener('change', refresh);
    mqSize.addEventListener('change', refresh);
    document.addEventListener('fullscreenchange', refresh);
    return () => {
      mqOrient.removeEventListener('change', refresh);
      mqSize.removeEventListener('change', refresh);
      document.removeEventListener('fullscreenchange', refresh);
    };
  }, []);

  const activate = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      const orientation = screen.orientation as ScreenOrientation &
        OrientationLock;
      if (orientation?.lock) {
        await orientation.lock('landscape').catch(() => undefined);
      }
    } catch {
      // Fullscreen / lock refused by browser — keep the banner visible
      // so the user can retry, but don't surface an error.
    }
  };

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-16 z-[60] flex justify-center px-3"
      role="dialog"
      aria-live="polite"
      aria-label="Mode paysage plein écran"
    >
      <div
        className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl border p-3 shadow-lg"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          color: 'var(--text)',
        }}
      >
        <span aria-hidden className="text-xl">
          📱↻
        </span>
        <span className="flex-1 text-sm">
          Pivote ton écran et passe en plein écran pour une meilleure
          expérience.
        </span>
        <button
          type="button"
          onClick={activate}
          className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white"
          style={{ background: 'var(--primary)' }}
        >
          Activer
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Ignorer"
          className="px-1 text-xl leading-none"
          style={{ color: 'var(--muted)' }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
