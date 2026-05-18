import { useEffect, useState } from 'react';

interface ScoreToastProps {
  message: string;
  background: string;
  /** Une "clé" qui change à chaque nouvel événement (force le remount). */
  triggerKey: number;
}

const VISIBLE_MS = 900;

export function ScoreToast({
  message,
  background,
  triggerKey,
}: ScoreToastProps) {
  // Le parent remonte le composant via `key={triggerKey}`, donc l'état
  // initial `true` est déjà correct à chaque nouvel événement — pas besoin
  // de `setVisible(true)` synchrone dans l'effet.
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setVisible(false), VISIBLE_MS);
    return () => window.clearTimeout(t);
  }, [triggerKey]);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-[34%] z-[8] -translate-x-1/2 select-none rounded-full px-4 py-1.5 font-bold text-white shadow-2xl"
      style={{
        background,
        animation: 'mb-toast-pop 280ms ease-out',
        fontSize: 'clamp(0.9rem, 2.4vw, 1.1rem)',
        textShadow: '0 1px 3px rgba(0,0,0,0.4)',
      }}
    >
      {message}
    </div>
  );
}
