import { create } from 'zustand';
import { createId } from '@mister-guiiug/dev-pwa-config/id';
import { storage } from '../storage';
import type { EbadMatch } from '../schemas';

/**
 * LE REGISTRE DES MATCHS eBad, À CÔTÉ DU MAGASIN DU MATCH — pas dedans.
 *
 * `useMatchStore` porte déjà le tableau de score, l'historique et les
 * joueurs ; le suivi eBad n'a besoin d'aucun de ses états. Le seul point de
 * contact est la fin d'un match préparé depuis eBad : `useMatchStore` appelle
 * alors `linkIfFree` (cf. `saveToHistory`). Ce magasin n'importe pas l'autre,
 * il n'y a donc pas de cycle.
 *
 * La liaison vit sur le match eBad (`linkedMatchId`) et sur lui seul : un
 * match de l'historique ne sait pas à quel match eBad il appartient, il le
 * retrouve en cherchant qui le désigne (`ebadForSavedMatch`).
 */

/** Ce que le formulaire saisit : tout le match eBad sauf ce que le registre pose. */
export type EbadMatchInput = Omit<EbadMatch, 'id' | 'createdAt'>;

interface EbadState {
  matches: EbadMatch[];
  /** Ajoute un match saisi ; rend son identifiant, ou `null` s'il est invalide. */
  addMatch: (input: EbadMatchInput) => string | null;
  /** Remplace les champs saisis d'un match existant. La liaison est gardée. */
  updateMatch: (id: string, input: EbadMatchInput) => boolean;
  removeMatch: (id: string) => void;
  /**
   * Lie un match eBad à un match de l'historique. Un match de l'historique
   * n'est lié qu'à UN match eBad : s'il l'était déjà ailleurs, cette liaison
   * est retirée.
   */
  link: (ebadId: string, savedMatchId: string) => void;
  /** Lie seulement si le match eBad n'est encore lié à rien. */
  linkIfFree: (ebadId: string, savedMatchId: string) => boolean;
  unlink: (ebadId: string) => void;
  /** Retire toute liaison vers ce match de l'historique (il a été supprimé). */
  forgetSavedMatch: (savedMatchId: string) => void;
  /**
   * Importe des matchs venus du connecteur. Un match déjà importé (même
   * `remoteId`) est mis à jour — horaires, terrain, résultat officiel — sans
   * perdre sa liaison au match scoré ; les autres sont ajoutés. Rend le
   * décompte, ou `null` si l'écriture a échoué.
   */
  importMatches: (
    inputs: EbadMatchInput[]
  ) => { added: number; updated: number } | null;
}

/** Écrit puis relit : l'état reflète ce qui est réellement persisté. */
function persist(next: EbadMatch[]): EbadMatch[] | null {
  if (!storage.saveEbadMatches(next)) return null;
  return storage.loadEbadMatches();
}

/** Les champs facultatifs vides ne sont pas écrits. */
function clean(input: EbadMatchInput): EbadMatchInput {
  const opt = (v: string | undefined) => {
    const t = v?.trim();
    return t ? t : undefined;
  };
  const team = (t: EbadMatchInput['team1']) => ({
    primary: t.primary.trim(),
    partner: opt(t.partner),
  });
  return {
    tournament: input.tournament.trim(),
    date: opt(input.date),
    discipline: input.discipline,
    round: opt(input.round),
    court: opt(input.court),
    time: opt(input.time),
    reference: opt(input.reference),
    points: input.points,
    team1: team(input.team1),
    team2: team(input.team2),
    reportedScore:
      input.reportedScore && input.reportedScore.length > 0
        ? input.reportedScore
        : undefined,
    linkedMatchId: input.linkedMatchId,
    remoteId: input.remoteId,
  };
}

export const useEbadStore = create<EbadState>()((set, get) => ({
  matches: storage.loadEbadMatches(),

  addMatch: input => {
    const id = createId();
    const match: EbadMatch = { ...clean(input), id, createdAt: Date.now() };
    const next = persist([match, ...get().matches]);
    if (!next) return null;
    set({ matches: next });
    return id;
  },

  updateMatch: (id, input) => {
    const current = get().matches.find(m => m.id === id);
    if (!current) return false;
    const updated: EbadMatch = {
      ...clean({
        ...input,
        linkedMatchId: current.linkedMatchId,
        remoteId: current.remoteId,
      }),
      id,
      createdAt: current.createdAt,
    };
    const next = persist(get().matches.map(m => (m.id === id ? updated : m)));
    if (!next) return false;
    set({ matches: next });
    return true;
  },

  removeMatch: id => {
    const next = persist(get().matches.filter(m => m.id !== id));
    if (next) set({ matches: next });
  },

  link: (ebadId, savedMatchId) => {
    if (!get().matches.some(m => m.id === ebadId)) return;
    const next = persist(
      get().matches.map(m => {
        if (m.id === ebadId) return { ...m, linkedMatchId: savedMatchId };
        if (m.linkedMatchId === savedMatchId) {
          return { ...m, linkedMatchId: undefined };
        }
        return m;
      })
    );
    if (next) set({ matches: next });
  },

  linkIfFree: (ebadId, savedMatchId) => {
    const target = get().matches.find(m => m.id === ebadId);
    if (!target || target.linkedMatchId) return false;
    get().link(ebadId, savedMatchId);
    return true;
  },

  unlink: ebadId => {
    const next = persist(
      get().matches.map(m =>
        m.id === ebadId ? { ...m, linkedMatchId: undefined } : m
      )
    );
    if (next) set({ matches: next });
  },

  importMatches: inputs => {
    const byRemote = new Map(
      get()
        .matches.filter(m => m.remoteId)
        .map(m => [m.remoteId as string, m])
    );
    let added = 0;
    let updated = 0;
    const now = Date.now();
    const fresh: EbadMatch[] = [];
    const replaced = new Map<string, EbadMatch>();
    inputs.forEach((input, index) => {
      const existing = input.remoteId
        ? byRemote.get(input.remoteId)
        : undefined;
      if (existing) {
        replaced.set(existing.id, {
          ...clean({
            ...input,
            // Pas encore de résultat officiel : on garde celui recopié à la main.
            reportedScore: input.reportedScore ?? existing.reportedScore,
            linkedMatchId: existing.linkedMatchId,
          }),
          id: existing.id,
          createdAt: existing.createdAt,
        });
        updated += 1;
      } else {
        // `now + index` : un ordre de saisie stable dans le lot importé.
        fresh.push({ ...clean(input), id: createId(), createdAt: now + index });
        added += 1;
      }
    });
    const next = persist([
      ...fresh,
      ...get().matches.map(m => replaced.get(m.id) ?? m),
    ]);
    if (!next) return null;
    set({ matches: next });
    return { added, updated };
  },

  forgetSavedMatch: savedMatchId => {
    if (!get().matches.some(m => m.linkedMatchId === savedMatchId)) return;
    const next = persist(
      get().matches.map(m =>
        m.linkedMatchId === savedMatchId
          ? { ...m, linkedMatchId: undefined }
          : m
      )
    );
    if (next) set({ matches: next });
  },
}));

/** Le match eBad lié à ce match de l'historique, s'il y en a un. */
export function ebadForSavedMatch(
  matches: readonly EbadMatch[],
  savedMatchId: string
): EbadMatch | undefined {
  return matches.find(m => m.linkedMatchId === savedMatchId);
}
