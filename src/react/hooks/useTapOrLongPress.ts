import { useCallback, useEffect, useRef, useState } from 'react';

interface Handlers {
  onPointerDown: (event: React.PointerEvent) => void;
  onPointerUp: (event: React.PointerEvent) => void;
  onPointerLeave: () => void;
  onPointerCancel: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  onKeyUp: (event: React.KeyboardEvent) => void;
  onContextMenu: (event: React.MouseEvent) => void;
}

export interface UseTapOrLongPressResult {
  isPressing: boolean;
  handlers: Handlers;
}

/**
 * Distingue un tap court (release avant le seuil → `onTap`) d'un appui long
 * (le timer atteint le seuil → `onLongPress`, le release ne déclenche plus
 * onTap). Compatible souris, tactile et clavier (Enter/Espace).
 */
export function useTapOrLongPress(
  onTap: () => void,
  onLongPress: () => void,
  thresholdMs = 380
): UseTapOrLongPressResult {
  const timerRef = useRef<number | null>(null);
  const consumedRef = useRef(false);
  const [isPressing, setIsPressing] = useState(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (timerRef.current != null) return;
    consumedRef.current = false;
    setIsPressing(true);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setIsPressing(false);
      consumedRef.current = true;
      onLongPress();
    }, thresholdMs);
  }, [onLongPress, thresholdMs]);

  const release = useCallback(() => {
    const wasPressing = timerRef.current != null;
    clearTimer();
    setIsPressing(false);
    if (wasPressing && !consumedRef.current) {
      onTap();
    }
  }, [clearTimer, onTap]);

  const cancel = useCallback(() => {
    clearTimer();
    setIsPressing(false);
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  const handlers: Handlers = {
    onPointerDown: event => {
      if (event.button !== undefined && event.button !== 0) return;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      start();
    },
    onPointerUp: () => release(),
    onPointerLeave: () => cancel(),
    onPointerCancel: () => cancel(),
    onKeyDown: event => {
      if (event.repeat) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        start();
      }
    },
    onKeyUp: event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        release();
      }
    },
    // Empêche le menu contextuel mobile (long-press iOS/Android).
    onContextMenu: event => event.preventDefault(),
  };

  return { isPressing, handlers };
}
