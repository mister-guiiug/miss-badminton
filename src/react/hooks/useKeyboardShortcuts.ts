import { useEffect } from 'react';

interface ShortcutHandlers {
  onTeam1?: () => void;
  onTeam2?: () => void;
  onUndo?: () => void;
  onReset?: () => void;
  onSwap?: () => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isEditableTarget(e.target)) return;
      const key = e.key.toLowerCase();
      switch (key) {
        case 'a':
        case '1':
          if (handlers.onTeam1) {
            e.preventDefault();
            handlers.onTeam1();
          }
          break;
        case 'l':
        case '2':
          if (handlers.onTeam2) {
            e.preventDefault();
            handlers.onTeam2();
          }
          break;
        case 'u':
          if (handlers.onUndo) {
            e.preventDefault();
            handlers.onUndo();
          }
          break;
        case 'r':
          if (handlers.onReset) {
            e.preventDefault();
            handlers.onReset();
          }
          break;
        case 's':
          if (handlers.onSwap) {
            e.preventDefault();
            handlers.onSwap();
          }
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlers]);
}
