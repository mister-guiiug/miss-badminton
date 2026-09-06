/**
 * Les joueurs — et ce qui les sépare d'un nom.
 *
 * CE QUI EXISTAIT. Une liste de chaînes (`mb_player_names`) pour
 * l'autocomplétion, et des matchs qui portaient les noms saisis. L'identité
 * d'un joueur était donc la chaîne elle-même : « tous mes matchs contre X »
 * n'était pas une question qu'on pouvait poser, et renommer quelqu'un
 * revenait à en créer un autre — l'ancien gardait tout l'historique.
 *
 * CE QUE CE MODULE POSE. Un profil (`Player`) avec un identifiant stable, que
 * les matchs référencent (`Team.primaryId` / `Team.partnerId`). Le nom devient
 * un attribut du profil, modifiable sans que l'historique bouge.
 *
 * ATTENTION — `Team.id` N'EST PAS UN IDENTIFIANT DE JOUEUR. Il vaut `'A'` ou
 * `'B'` et désigne le CÔTÉ de terrain d'origine de l'équipe (cf.
 * `MatchSetupWizard`, et `MatchView` qui compare `team1.id === 'B'` après une
 * permutation). Le réutiliser pour l'identité d'un joueur casserait ces deux
 * lectures. D'où deux champs distincts.
 *
 * DEUX SNAPSHOTS, UNE VÉRITÉ. Un match garde le nom écrit au moment où il a
 * été joué (`Team.primary`) EN PLUS de l'identifiant. Le registre fait foi à
 * l'affichage (`displayName` le consulte d'abord) ; le nom recopié sert de
 * repli quand aucun identifiant n'est posé — un fichier importé d'une version
 * d'avant, une donnée réparée à la main — et garde l'export lisible par une
 * version qui ne connaît pas les profils.
 *
 * Module PUR : aucune écriture, aucun accès au stockage. `storage.ts`
 * l'appelle et persiste ; `players.test.ts` l'éprouve sans DOM.
 */
import { createId } from '@mister-guiiug/dev-pwa-config/id';
import type { Player, SavedMatch, Team } from './schemas';

export type { Player };

/** Les deux places d'une équipe qui portent un joueur. */
export type PlayerSlot = 'primary' | 'partner';

const SLOTS: PlayerSlot[] = ['primary', 'partner'];

/** Le champ d'identifiant correspondant à une place. */
function idField(slot: PlayerSlot): 'primaryId' | 'partnerId' {
  return slot === 'primary' ? 'primaryId' : 'partnerId';
}

/**
 * Le nom tel qu'on l'affiche : espaces de bord retirés, espaces internes
 * ramenés à un seul. « Jean  Dupont » et « Jean Dupont » sont la même frappe.
 */
export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * LA RÈGLE DES HOMONYMES, en une fonction.
 *
 * Deux saisies désignent le même profil quand elles ont la même clé : nom
 * normalisé, puis mis en minuscules. Les accents COMPTENT — « René » et
 * « Rene » sont deux profils, parce que rien ne dit que c'est la même
 * personne, et qu'un rapprochement est bien plus difficile à défaire qu'une
 * séparation.
 *
 * Ce que ça implique, et qu'il faut assumer : deux personnes RÉELLEMENT
 * homonymes dans un historique sont indiscernables. Aucune donnée ne les
 * sépare — ni date, ni partenaire, ni score — et la migration ne va pas
 * inventer une frontière. Elles reçoivent donc UN profil. Le sens du choix
 * est délibéré : une fusion se voit (un classement affiche un total trop
 * gros) et se répare depuis les Réglages en renommant l'un des deux ; une
 * séparation arbitraire, elle, éparpillerait l'historique entre des profils
 * que l'utilisateur n'a jamais créés, et personne ne s'en apercevrait.
 *
 * C'est aussi la clé qu'utilisait déjà le classement de l'historique
 * (`computeStats` regroupait sur `name.trim().toLowerCase()`) : la migration
 * ne change donc le nombre de joueurs affichés nulle part.
 */
export function playerKey(name: string): string {
  return normalizeName(name).toLowerCase();
}

/** Index par identifiant. Le premier profil d'un identifiant gagne. */
export function indexById(players: readonly Player[]): Map<string, Player> {
  const map = new Map<string, Player>();
  for (const p of players) if (!map.has(p.id)) map.set(p.id, p);
  return map;
}

/** Index par clé de rapprochement. Le premier profil d'une clé gagne. */
export function indexByKey(players: readonly Player[]): Map<string, Player> {
  const map = new Map<string, Player>();
  for (const p of players) {
    const key = playerKey(p.name);
    if (key && !map.has(key)) map.set(key, p);
  }
  return map;
}

/**
 * Le nom à AFFICHER pour une place d'équipe : celui du registre si le match
 * porte un identifiant connu, sinon le nom recopié dans le match. C'est ce
 * qui fait qu'un renommage se voit partout, même si la réécriture des
 * snapshots n'a pas abouti.
 */
export function displayName(
  team: Team,
  slot: PlayerSlot,
  byId: Map<string, Player>
): string {
  const id = team[idField(slot)];
  const fromRegistry = id ? byId.get(id)?.name : undefined;
  return (
    fromRegistry ?? (slot === 'primary' ? team.primary : team.partner) ?? ''
  );
}

/** Les noms affichables d'une équipe, places vides écartées. */
export function teamDisplayNames(
  team: Team,
  byId: Map<string, Player>
): string[] {
  return SLOTS.map(slot => displayName(team, slot, byId)).filter(
    n => n.trim().length > 0
  );
}

/** Les identifiants de joueur portés par un match. */
export function matchPlayerIds(match: SavedMatch): string[] {
  const out: string[] = [];
  for (const team of [match.config.team1, match.config.team2]) {
    for (const slot of SLOTS) {
      const id = team[idField(slot)];
      if (id) out.push(id);
    }
  }
  return out;
}

/**
 * Accents et casse ignorés — pour CHERCHER, pas pour identifier.
 * `playerKey` garde les accents (deux orthographes = deux personnes tant
 * qu'on n'en sait pas plus) ; une boîte de recherche, elle, doit trouver
 * « Gaëlle » quand on tape « gaelle ».
 */
function searchable(value: string): string {
  return normalizeName(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/**
 * Le match concerne-t-il ce joueur ? Par identifiant quand la recherche en
 * désigne un (exact), sinon par fragment de nom affiché.
 */
export function matchInvolves(
  match: SavedMatch,
  query: { id?: string; text?: string },
  byId: Map<string, Player>
): boolean {
  if (query.id) return matchPlayerIds(match).includes(query.id);
  const needle = searchable(query.text ?? '');
  if (!needle) return true;
  const names = [
    ...teamDisplayNames(match.config.team1, byId),
    ...teamDisplayNames(match.config.team2, byId),
  ];
  return names.some(n => searchable(n).includes(needle));
}

export interface UpsertResult {
  players: Player[];
  player: Player;
  /** Faux quand le profil existait déjà à l'identique. */
  changed: boolean;
}

/**
 * Rend le profil de ce nom, en le créant s'il n'existe pas encore.
 * Un nom déjà connu ne crée rien — c'est la règle des homonymes appliquée à
 * la saisie courante, la même qu'à la migration.
 */
export function upsertPlayer(
  players: readonly Player[],
  name: string,
  options: { now?: number; makeId?: () => string } = {}
): UpsertResult {
  const clean = normalizeName(name);
  const key = playerKey(clean);
  const existing = key ? indexByKey(players).get(key) : undefined;
  if (existing)
    return { players: [...players], player: existing, changed: false };
  const player: Player = {
    id: (options.makeId ?? (() => createId('p')))(),
    name: clean,
    createdAt: options.now ?? Date.now(),
  };
  return { players: [player, ...players], player, changed: true };
}

export interface MigratePlayersOptions {
  /** Profils déjà connus — ils gardent leur identifiant et leur nom. */
  knownPlayers?: readonly Player[];
  /** L'ancienne liste d'autocomplétion (`mb_player_names`). */
  legacyNames?: readonly string[];
  now?: number;
  makeId?: () => string;
}

export interface MigratePlayersResult {
  players: Player[];
  matches: SavedMatch[];
  /** Faux quand rien n'a bougé : le stockage n'est alors pas réécrit. */
  changed: boolean;
}

/**
 * LA MIGRATION : des noms vers des profils, sans perte.
 *
 * Elle parcourt l'historique (trié du plus récent au plus ancien), crée un
 * profil par clé de nom rencontrée, et POSE l'identifiant sur le match. Le
 * nom du profil est l'orthographe la PLUS RÉCENTE — le premier match
 * rencontré est le dernier joué, et c'est la frappe la plus fraîche qui a le
 * plus de chances d'être celle que l'utilisateur reconnaît.
 *
 * L'ancienne liste d'autocomplétion est traitée ensuite : elle contient des
 * noms qui n'ont pas encore de match, et qui ne doivent pas disparaître de
 * la liste des joueurs.
 *
 * ADDITIVE, DONC REJOUABLE. Elle n'efface rien et ne renomme rien : un match
 * déjà identifié est laissé tel quel, un profil déjà présent est réutilisé.
 * On peut donc la relancer sur l'historique complet d'IndexedDB après l'avoir
 * jouée sur la copie plafonnée de localStorage, sans dupliquer un profil.
 */
export function migratePlayers(
  matches: readonly SavedMatch[],
  options: MigratePlayersOptions = {}
): MigratePlayersResult {
  const now = options.now ?? Date.now();
  const makeId = options.makeId ?? (() => createId('p'));
  const players: Player[] = [...(options.knownPlayers ?? [])];
  const byKey = indexByKey(players);
  const byId = indexById(players);
  let changed = false;

  /** Le profil de ce nom, créé si besoin. `null` si le nom est vide. */
  const profileFor = (rawName: string, createdAt: number): Player | null => {
    const clean = normalizeName(rawName);
    const key = playerKey(clean);
    if (!key) return null;
    const existing = byKey.get(key);
    if (existing) return existing;
    const player: Player = { id: makeId(), name: clean, createdAt };
    players.push(player);
    byKey.set(key, player);
    byId.set(player.id, player);
    changed = true;
    return player;
  };

  const nextMatches = matches.map(match => {
    let touched = false;
    const stampTeam = (team: Team): Team => {
      let next = team;
      for (const slot of SLOTS) {
        const field = idField(slot);
        const current = next[field];
        // Un identifiant déjà posé ET connu : on n'y touche pas. Un
        // identifiant orphelin (profil supprimé, donnée bricolée) est
        // réattribué depuis le nom recopié — sinon le match deviendrait
        // introuvable par joueur.
        if (current && byId.has(current)) continue;
        const raw = slot === 'primary' ? next.primary : next.partner;
        const player = profileFor(raw ?? '', match.completedAt || now);
        if (!player) continue;
        next = { ...next, [field]: player.id };
        touched = true;
      }
      return next;
    };
    const team1 = stampTeam(match.config.team1);
    const team2 = stampTeam(match.config.team2);
    if (!touched) return match;
    changed = true;
    return { ...match, config: { ...match.config, team1, team2 } };
  });

  for (const name of options.legacyNames ?? []) profileFor(name, now);

  return { players, matches: nextMatches, changed };
}

/**
 * Renomme un profil et RECOPIE le nouveau nom dans les matchs qui le
 * référencent. Le registre suffirait à l'affichage ; la recopie garde
 * l'export lisible par une version qui ignore les profils, et rend
 * l'historique auto-descriptif si le registre venait à se perdre.
 */
export function renameInMatches(
  matches: readonly SavedMatch[],
  id: string,
  name: string
): { matches: SavedMatch[]; changed: boolean } {
  const clean = normalizeName(name);
  let changed = false;
  const next = matches.map(match => {
    let touched = false;
    const applyTeam = (team: Team): Team => {
      let out = team;
      for (const slot of SLOTS) {
        if (out[idField(slot)] !== id) continue;
        const current = slot === 'primary' ? out.primary : out.partner;
        if (current === clean) continue;
        out = { ...out, [slot]: clean };
        touched = true;
      }
      return out;
    };
    const team1 = applyTeam(match.config.team1);
    const team2 = applyTeam(match.config.team2);
    if (!touched) return match;
    changed = true;
    return { ...match, config: { ...match.config, team1, team2 } };
  });
  return { matches: next, changed };
}

/**
 * Les profils qui apparaissent dans au moins un match, du plus récemment
 * créé au plus ancien. Sert à ne proposer au filtre que des joueurs qui ont
 * effectivement joué.
 */
export function playersInMatches(
  matches: readonly SavedMatch[],
  players: readonly Player[]
): Player[] {
  const seen = new Set<string>();
  for (const m of matches) for (const id of matchPlayerIds(m)) seen.add(id);
  return players.filter(p => seen.has(p.id));
}
