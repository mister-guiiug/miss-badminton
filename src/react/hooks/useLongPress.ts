import { useCallback, useEffect, useRef, useState } from 'react';

interface LongPressHandlers {
  onPointerDown: (event: React.PointerEvent) => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onPointerCancel: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  onKeyUp: (event: React.KeyboardEvent) => void;
  onClick: (event: React.MouseEvent) => void;
}

export interface UseLongPressResult {
  isPressing: boolean;
  handlers: LongPressHandlers;
}

export function useLongPress(
  callback: () => void,
  thresholdMs = 320
): UseLongPressResult {
  const timerRef = useRef<number | null>(null);
  const [isPressing, setIsPressing] = useState(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (timerRef.current != null) return;
    setIsPressing(true);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setIsPressing(false);
      callback();
    }, thresholdMs);
  }, [callback, thresholdMs]);

  const cancel = useCallback(() => {
    clearTimer();
    setIsPressing(false);
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  const handlers: LongPressHandlers = {
    onPointerDown: event => {
      event.currentTarget.setPointerCapture?.(event.pointerId);
      start();
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onKeyDown: event => {
      if (event.repeat) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        start();
      }
    },
    onKeyUp: event => {
      if (event.key === 'Enter' || event.key === ' ') cancel();
    },
    // Browsers fire a synthetic click on Enter/Space (detail === 0); we
    // already handled that via keydown so swallow it to avoid double-firing.
    // For real pointer clicks (detail > 0) the long-press timer is the only
    // path to the callback — short taps must not count.
    onClick: event => event.preventDefault(),
  };

  return { isPressing, handlers };
}
