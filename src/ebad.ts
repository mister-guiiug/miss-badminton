/**
 * eBad — le suivi des tournois FFBaD, rapproché des matchs scorés ici.
 *
 * CE QUI EXISTE CÔTÉ eBad. L'application de la fédération affiche les matchs
 * d'un tournoi (tableau, tour, terrain, horaire, joueurs) et permet d'y saisir
 * un résultat à la main. Elle n'expose AUCUNE API publique, et Miss Badminton
 * n'a pas de serveur : impossible d'aller y lire les matchs depuis le
 * navigateur. L'utilisateur recopie donc ce qu'il lit dans eBad (cf.
 * `EbadMatchSchema`), et ce module fait le reste :
 *
 *  - PRÉPARER : un match eBad devient une configuration prête pour l'assistant
 *    (`configFromEbad`) — simple ou double selon la discipline, joueurs
 *    préremplis, format officiel.
 *  - RAPPROCHER : un match de l'historique et un match eBad se ressemblent-ils
 *    (`linkScore`) ? Les noms comptent le plus, puis la discipline, puis le
 *    jour. Le rapprochement ne se fait jamais tout seul : on SUGGÈRE, et
 *    l'utilisateur lie.
 *  - REPORTER : le score à saisir dans eBad, dans l'ORDRE DES ÉQUIPES eBad
 *    (`scoreForEbad`) — l'équipe de gauche ici peut être la seconde là-bas —
 *    et la comparaison avec le score qui y a été saisi (`compareReported`).
 *
 * Module PUR : ni React, ni stockage, ni socle. `ebad.test.ts` l'éprouve
 * sans DOM.
 */
import type { MatchConfig, Team } from './react/components/MatchSetupWizard';
import type {
  EbadDiscipline,
  EbadMatch,
  EbadSetScore,
  SavedMatch,
} from './schemas';
import { FORMAT_15, FORMAT_21 } from './scoring';

export type { EbadDiscipline, EbadMatch, EbadSetScore };

export const EBAD_DISCIPLINES: readonly EbadDiscipline[] = [
  'SH',
  'SD',
  'DH',
  'DD',
  'DX',
];

/** SH / SD se jouent en simple, DH / DD / DX en double. */
export function isDoublesDiscipline(discipline: EbadDiscipline): boolean {
  return discipline !== 'SH' && discipline !== 'SD';
}

/**
 * Une configuration prête pour l'assistant. Le format est celui qu'annonce le
 * match eBad, 15 points par défaut (la FFBaD joue en 15 points depuis le
 * 1er septembre 2026) ; deux sets gagnants, changements de côté des Lois.
 * `ebadMatchId` voyage avec : c'est lui qui liera le résultat en fin de match.
 */
export function configFromEbad(e: EbadMatch): MatchConfig {
  const doubles = isDoublesDiscipline(e.discipline);
  const format = e.points === 21 ? FORMAT_21 : FORMAT_15;
  const team = (t: EbadMatch['team1'], id: 'A' | 'B'): Team => ({
    primary: t.primary.trim(),
    partner: doubles ? (t.partner ?? '').trim() : undefined,
    id,
  });
  return {
    type: doubles ? 'doubles' : 'singles',
    sets: 2,
    points: format.points,
    winBy: format.winBy,
    cap: format.cap,
    sideChange: 'each-set',
    sideChangeAt: format.sideChangeAt,
    timeLimitMin: null,
    tieBreak: 'none',
    team1: team(e.team1, 'A'),
    team2: team(e.team2, 'B'),
    ebadMatchId: e.id,
  };
}

/** Les noms d'une équipe eBad, sans les cases vides. */
export function ebadTeamNames(team: EbadMatch['team1']): string[] {
  return [team.primary, team.partner ?? ''].map(n => n.trim()).filter(Boolean);
}

/** Les noms d'une équipe de l'historique, tels que saisis dans le match. */
function rawTeamNames(team: Team): string[] {
  return [team.primary, team.partner ?? ''].map(n => n.trim()).filter(Boolean);
}

/** Rend les noms à comparer pour une équipe de l'historique. */
export type TeamNamesResolver = (team: Team) => string[];

/**
 * Les mots d'un nom : minuscules, accents retirés, ponctuation ignorée.
 *
 * PLUS TOLÉRANT QUE `playerKey`, ET C'EST VOULU. `playerKey` décide qu'il
 * s'agit du MÊME profil — une fusion est dure à défaire, il garde donc les
 * accents. Ici on ne fusionne rien : on classe des suggestions. eBad écrit
 * « DUPONT Jean », l'utilisateur a tapé « Jean Dupont » ou « Dupont » : ce
 * sont les mêmes mots, dans un autre ordre.
 */
function tokens(name: string): Set<string> {
  return new Set(
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(w => w.length >= 2)
  );
}

/**
 * Ressemblance de deux noms, de 0 à 1 : la part des mots du nom le plus court
 * qu'on retrouve dans l'autre. « Dupont » et « DUPONT Jean » valent 1.
 */
export function nameSimilarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let common = 0;
  for (const w of ta) if (tb.has(w)) common += 1;
  return common / Math.min(ta.size, tb.size);
}

/**
 * Ressemblance de deux équipes, de 0 à 1 : la meilleure association des
 * joueurs un à un (en double, l'ordre des partenaires ne compte pas),
 * rapportée au nombre de joueurs de l'équipe la plus fournie.
 */
export function teamSimilarity(a: string[], b: string[]): number {
  const size = Math.max(a.length, b.length);
  if (size === 0) return 0;
  const [a1 = '', a2 = ''] = a;
  const [b1 = '', b2 = ''] = b;
  const straight = nameSimilarity(a1, b1) + nameSimilarity(a2, b2);
  const crossed = nameSimilarity(a1, b2) + nameSimilarity(a2, b1);
  return Math.min(1, Math.max(straight, crossed) / size);
}

/** Les équipes sont-elles dans le même ordre ici et dans eBad ? */
export type Orientation = 'same' | 'swapped';

export interface LinkAssessment {
  /** Note de tri : plus elle est haute, plus les deux matchs se ressemblent. */
  score: number;
  /** Ressemblance des joueurs seule, de 0 à 1. */
  names: number;
  orientation: Orientation;
  /** Assez proches pour être mis en avant comme « suggéré ». */
  likely: boolean;
}

/** Le jour local d'un horodatage, `AAAA-MM-JJ` — la forme des dates eBad. */
export function localDateKey(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dayDistance(a: string, b: string): number | null {
  const ta = Date.parse(`${a}T00:00:00Z`);
  const tb = Date.parse(`${b}T00:00:00Z`);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return null;
  return Math.round(Math.abs(ta - tb) / 86_400_000);
}

/**
 * À quel point un match de l'historique ressemble à un match eBad, et dans
 * quel sens ses équipes s'y lisent.
 *
 * Les noms pèsent le plus (0 à 100). La discipline ajoute 10 quand simple et
 * double concordent, retire 30 sinon : un simple ne se reporte pas sur un
 * double. Le jour ajoute 20 s'il est le même, 5 à un jour près (un tournoi
 * qui finit après minuit), retire 10 au-delà ; sans date eBad, il ne compte
 * pas.
 */
export function linkScore(
  e: EbadMatch,
  saved: SavedMatch,
  namesOf: TeamNamesResolver = rawTeamNames
): LinkAssessment {
  const e1 = ebadTeamNames(e.team1);
  const e2 = ebadTeamNames(e.team2);
  const s1 = namesOf(saved.config.team1);
  const s2 = namesOf(saved.config.team2);
  const same = (teamSimilarity(e1, s1) + teamSimilarity(e2, s2)) / 2;
  const swapped = (teamSimilarity(e1, s2) + teamSimilarity(e2, s1)) / 2;
  const orientation: Orientation = swapped > same ? 'swapped' : 'same';
  const names = Math.max(same, swapped);

  const typeOk =
    (saved.config.type === 'doubles') === isDoublesDiscipline(e.discipline);
  let score = names * 100 + (typeOk ? 10 : -30);
  if (e.date) {
    const distance = dayDistance(e.date, localDateKey(saved.completedAt));
    if (distance === 0) score += 20;
    else if (distance === 1) score += 5;
    else if (distance !== null) score -= 10;
  }
  return { score, names, orientation, likely: typeOk && names >= 0.75 };
}

/**
 * Les matchs de l'historique à proposer pour un match eBad, du plus probable
 * au moins probable. Ceux déjà liés à un AUTRE match eBad sont écartés : un
 * résultat ne se reporte qu'une fois.
 */
export function suggestSavedMatches(
  e: EbadMatch,
  history: readonly SavedMatch[],
  ebadMatches: readonly EbadMatch[],
  namesOf?: TeamNamesResolver
): { match: SavedMatch; assessment: LinkAssessment }[] {
  const takenByOthers = new Set(
    ebadMatches
      .filter(x => x.id !== e.id && x.linkedMatchId)
      .map(x => x.linkedMatchId as string)
  );
  return history
    .filter(m => !takenByOthers.has(m.id))
    .map(match => ({ match, assessment: linkScore(e, match, namesOf) }))
    .sort((a, b) => b.assessment.score - a.assessment.score);
}

/**
 * Les matchs eBad à proposer pour un match de l'historique, du plus probable
 * au moins probable. Ceux déjà liés à un AUTRE match de l'historique sont
 * écartés.
 */
export function suggestEbadMatches(
  saved: SavedMatch,
  ebadMatches: readonly EbadMatch[],
  namesOf?: TeamNamesResolver
): { ebad: EbadMatch; assessment: LinkAssessment }[] {
  return ebadMatches
    .filter(e => !e.linkedMatchId || e.linkedMatchId === saved.id)
    .map(ebad => ({ ebad, assessment: linkScore(ebad, saved, namesOf) }))
    .sort((a, b) => b.assessment.score - a.assessment.score);
}

/** Les sets lus depuis l'autre camp. */
function flip(sets: readonly EbadSetScore[]): EbadSetScore[] {
  return sets.map(s => ({ team1: s.team2, team2: s.team1 }));
}

/**
 * Le score du match de l'historique, dans l'ORDRE DES ÉQUIPES eBad : c'est
 * celui qu'on recopie dans eBad.
 */
export function scoreForEbad(
  e: EbadMatch,
  saved: SavedMatch,
  namesOf?: TeamNamesResolver
): EbadSetScore[] {
  const { orientation } = linkScore(e, saved, namesOf);
  return orientation === 'swapped'
    ? flip(saved.setScores)
    : saved.setScores.map(s => ({ ...s }));
}

/**
 * Le score saisi dans eBad est-il celui du match scoré ?
 * - `'none'` : rien n'a encore été saisi dans eBad (ou pas de match lié) ;
 * - `'match'` : mêmes sets, dans le même ordre ;
 * - `'mismatch'` : un set diffère, ou leur nombre.
 */
export function compareReported(
  e: EbadMatch,
  saved: SavedMatch | undefined,
  namesOf?: TeamNamesResolver
): 'none' | 'match' | 'mismatch' {
  if (!saved || !e.reportedScore || e.reportedScore.length === 0) {
    return 'none';
  }
  const expected = scoreForEbad(e, saved, namesOf);
  const reported = e.reportedScore;
  if (expected.length !== reported.length) return 'mismatch';
  return expected.every(
    (s, i) => s.team1 === reported[i]?.team1 && s.team2 === reported[i]?.team2
  )
    ? 'match'
    : 'mismatch';
}

/** `21-15 18-21 21-19` — la forme qu'on lit et qu'on recopie. */
export function formatSets(sets: readonly EbadSetScore[]): string {
  return sets.map(s => `${s.team1}-${s.team2}`).join(' ');
}

/**
 * Lit un score tapé à la main : sets séparés par des espaces, virgules,
 * points-virgules ou barres obliques ; chaque set `21-15`, `21:15` ou
 * `21–15`. Rend `null` si un morceau ne se lit pas, si un set est à égalité,
 * ou s'il y a plus de neuf sets. Une chaîne vide rend une liste vide : « pas
 * encore saisi ».
 */
export function parseSets(text: string): EbadSetScore[] | null {
  const parts = text
    .trim()
    .split(/[\s,;/]+/)
    .filter(Boolean);
  if (parts.length > 9) return null;
  const sets: EbadSetScore[] = [];
  for (const part of parts) {
    const m = /^(\d{1,2})[-:–—](\d{1,2})$/.exec(part);
    if (!m) return null;
    const team1 = Number(m[1]);
    const team2 = Number(m[2]);
    if (team1 === team2) return null;
    sets.push({ team1, team2 });
  }
  return sets;
}

/**
 * Ordre d'affichage : par jour, puis par heure, puis dans l'ordre de saisie.
 * Un match sans date passe après ceux qui en ont une.
 */
export function sortEbadMatches(matches: readonly EbadMatch[]): EbadMatch[] {
  return [...matches].sort((a, b) => {
    const da = a.date ?? '9999-99-99';
    const db = b.date ?? '9999-99-99';
    if (da !== db) return da < db ? -1 : 1;
    const ta = a.time ?? '99:99';
    const tb = b.time ?? '99:99';
    if (ta !== tb) return ta < tb ? -1 : 1;
    return a.createdAt - b.createdAt;
  });
}

/** Les matchs regroupés par tournoi, chaque groupe trié (`sortEbadMatches`). */
export function groupByTournament(
  matches: readonly EbadMatch[]
): { tournament: string; matches: EbadMatch[] }[] {
  const groups = new Map<string, EbadMatch[]>();
  for (const m of sortEbadMatches(matches)) {
    const key = m.tournament.trim();
    const list = groups.get(key);
    if (list) list.push(m);
    else groups.set(key, [m]);
  }
  return [...groups].map(([tournament, list]) => ({
    tournament,
    matches: list,
  }));
}

/** Les noms de tournois déjà saisis, pour l'autocomplétion. */
export function knownTournaments(matches: readonly EbadMatch[]): string[] {
  return [...new Set(matches.map(m => m.tournament.trim()).filter(Boolean))];
}

/**
 * La configuration sans son indice eBad. Rejouer un match, en faire un modèle
 * ou le partager en lien ne doit pas emporter la liaison : le nouveau match
 * n'est pas celui du tableau eBad.
 */
export function withoutEbad<T extends { ebadMatchId?: string }>(
  config: T
): Omit<T, 'ebadMatchId'> {
  const { ebadMatchId: _ignored, ...rest } = config;
  void _ignored;
  return rest;
}

/** « Tournoi · SH · P10 — Poule A » : ce qui situe un match eBad en une ligne. */
export function describeEbad(e: EbadMatch): string {
  return [e.tournament, e.discipline, e.round]
    .map(x => x?.trim())
    .filter(Boolean)
    .join(' · ');
}

/** « A / B » : une équipe eBad en une ligne. */
export function ebadTeamLabel(team: EbadMatch['team1']): string {
  return ebadTeamNames(team).join(' / ');
}
