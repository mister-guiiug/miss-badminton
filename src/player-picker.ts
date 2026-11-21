/**
 * LE CHOIX D'UN JOUEUR DÉJÀ ENREGISTRÉ, et le pré-remplissage de l'assistant.
 *
 * L'assistant ne proposait les profils que par un `<datalist>` : sur Android
 * la liste n'apparaît qu'en tapant, dans la barre du clavier, et sur iOS elle
 * se cache derrière une flèche que personne ne voit. Choisir un joueur connu
 * revenait donc à retaper son nom — à la moindre faute de frappe, un profil
 * de plus. L'assistant affiche maintenant les joueurs enregistrés en boutons
 * à toucher ; ce module décide lesquels, dans quel ordre, et où ils vont.
 *
 * Module PUR : ni React, ni stockage. `player-picker.test.ts` l'éprouve.
 */
import type { MatchType } from './react/components/MatchSetupWizard';
import { displayName, playerKey, type Player } from './players';
import type { SavedMatch } from './schemas';

/** Les quatre places d'un match : joueur et partenaire de chaque équipe. */
export type SlotKey = 't1p' | 't1q' | 't2p' | 't2q';

export interface DraftTeams {
  team1: { primary: string; partner: string };
  team2: { primary: string; partner: string };
}

/** Les places à remplir, dans l'ordre où on les remplit. */
export function slotsFor(type: MatchType): SlotKey[] {
  return type === 'doubles' ? ['t1p', 't1q', 't2p', 't2q'] : ['t1p', 't2p'];
}

export function slotValue(teams: DraftTeams, slot: SlotKey): string {
  const team = slot.startsWith('t1') ? teams.team1 : teams.team2;
  return slot.endsWith('p') ? team.primary : team.partner;
}

export function withSlot(
  teams: DraftTeams,
  slot: SlotKey,
  value: string
): DraftTeams {
  const key = slot.startsWith('t1') ? 'team1' : 'team2';
  const field = slot.endsWith('p') ? 'primary' : 'partner';
  return { ...teams, [key]: { ...teams[key], [field]: value } };
}

/**
 * Où va le joueur touché : la place choisie (dernier champ touché) si elle
 * fait partie du match, sinon la première place vide. `null` quand tout est
 * rempli et qu'aucun champ n'a été désigné.
 */
export function targetSlot(
  type: MatchType,
  teams: DraftTeams,
  active: SlotKey | null
): SlotKey | null {
  const slots = slotsFor(type);
  if (active && slots.includes(active)) return active;
  return slots.find(s => !slotValue(teams, s).trim()) ?? null;
}

/** La place vide suivante après `from`, pour enchaîner les touchers. */
export function nextEmptySlot(
  type: MatchType,
  teams: DraftTeams,
  from: SlotKey
): SlotKey | null {
  const slots = slotsFor(type);
  const start = slots.indexOf(from);
  const ordered = [...slots.slice(start + 1), ...slots.slice(0, start)];
  return ordered.find(s => !slotValue(teams, s).trim()) ?? null;
}

/**
 * Les profils, les plus récemment joués d'abord (d'après l'historique, le
 * plus récent en tête), puis les autres dans l'ordre du registre. Le joueur
 * d'hier soir est au bout du doigt ; celui d'il y a six mois reste là.
 */
export function playersByRecentUse(
  players: readonly Player[],
  history: readonly SavedMatch[]
): Player[] {
  const rank = new Map<string, number>();
  const byKey = new Map(players.map(p => [playerKey(p.name), p.id]));
  history.forEach((match, index) => {
    for (const team of [match.config.team1, match.config.team2]) {
      const ids = [
        team.primaryId ?? byKey.get(playerKey(team.primary)),
        team.partnerId ??
          (team.partner ? byKey.get(playerKey(team.partner)) : undefined),
      ];
      for (const id of ids) {
        if (id && !rank.has(id)) rank.set(id, index);
      }
    }
  });
  return players
    .map((player, order) => ({ player, order }))
    .sort((a, b) => {
      const ra = rank.get(a.player.id) ?? Number.POSITIVE_INFINITY;
      const rb = rank.get(b.player.id) ?? Number.POSITIVE_INFINITY;
      return ra !== rb ? ra - rb : a.order - b.order;
    })
    .map(x => x.player);
}

function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/**
 * Les profils dont le nom contient la frappe, accents et casse ignorés. Une
 * frappe vide, ou qui est déjà exactement un nom connu, ne filtre rien : le
 * champ pré-rempli « Léa » doit laisser voir tous les autres joueurs.
 */
export function filterPlayers(
  players: readonly Player[],
  query: string
): Player[] {
  const q = fold(query);
  if (!q || players.some(p => fold(p.name) === q)) return [...players];
  return players.filter(p => fold(p.name).includes(q));
}

/**
 * LE PRÉ-REMPLISSAGE : les joueurs du dernier match joué, sous leur nom
 * courant (un renommage depuis se voit). `null` sans historique, ou quand le
 * dernier match a été joué sans saisir un seul nom — rien à reprendre.
 */
export function prefillFromHistory(
  history: readonly SavedMatch[],
  byId: Map<string, Player>
): DraftTeams | null {
  const last = history[0];
  if (!last) return null;
  const team = (t: SavedMatch['config']['team1']) => ({
    primary: displayName(t, 'primary', byId).trim(),
    partner: displayName(t, 'partner', byId).trim(),
  });
  const teams = {
    team1: team(last.config.team1),
    team2: team(last.config.team2),
  };
  const any = [
    teams.team1.primary,
    teams.team1.partner,
    teams.team2.primary,
    teams.team2.partner,
  ].some(Boolean);
  return any ? teams : null;
}
