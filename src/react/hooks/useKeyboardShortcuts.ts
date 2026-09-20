import { useMemo } from 'react';
import {
  useKeyboardShortcuts as useShortcutMap,
  type ShortcutMap,
} from '@mister-guiiug/dev-pwa-config/react/use-keyboard-shortcuts';

interface ShortcutHandlers {
  onTeam1?: () => void;
  onTeam2?: () => void;
  onUndo?: () => void;
  onReset?: () => void;
  onSwap?: () => void;
}

/** Les touches de chaque geste — celles que l'écran Paramètres énumère. */
const KEYS: ReadonlyArray<[keyof ShortcutHandlers, readonly string[]]> = [
  ['onTeam1', ['a', '1']],
  ['onTeam2', ['l', '2']],
  ['onUndo', ['u']],
  ['onReset', ['r']],
  ['onSwap', ['s']],
];

/**
 * Les raccourcis du tableau de score, sur le `useKeyboardShortcuts` du socle.
 * C'est lui qui écoute `keydown`, ignore une frappe née dans un champ éditable
 * (`input`, `textarea`, `select`, `contenteditable`) ou pendant une
 * composition IME, et route par touche. Ce fichier ne garde que le vocabulaire
 * de l'app — cinq gestes, sept touches — et UNE garde que le socle n'a pas :
 * une frappe avec modificateur n'est pas un geste. Ctrl+R recharge, Ctrl+S
 * enregistre, Alt+1 change d'onglet ; les intercepter, c'est voler ses
 * raccourcis au navigateur.
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  const shortcuts = useMemo(() => {
    const map: ShortcutMap = {};
    for (const [name, keys] of KEYS) {
      const handler = handlers[name];
      if (!handler) continue;
      const onKey = (event: KeyboardEvent) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        event.preventDefault();
        handler();
      };
      for (const key of keys) map[key] = onKey;
    }
    return map;
  }, [handlers]);
  useShortcutMap(shortcuts);
}
