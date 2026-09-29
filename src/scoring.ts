import type {
  MatchConfig,
  PointsCap,
  PointsTarget,
  SideChangeAt,
  WinBy,
} from './react/components/MatchSetupWizard';

/**
 * LES RÈGLES D'UN SET, écrites à UN seul endroit.
 *
 * Le magasin (qui décide qu'un set est fini) et le tableau de score (qui
 * annonce la balle de set) portaient chacun sa copie de `isSetWon`, et tous
 * deux codaient en dur ce que le format de 2026 fait bouger : les deux points
 * d'écart, et le changement de côté à 11. La FFBaD joue en 15 points depuis le
 * 1er septembre 2026 (deux points d'écart dès 14-14, plafond à 21, changement
 * de côté à 8 au troisième set), la BWF le fait entrer dans ses Lois le
 * 4 janvier 2027 : tout cela devient un paramètre du match.
 *
 * Module pur, sans React ni stockage : les tests le jouent point par point.
 */

/** Ce qui décide qu'un set est gagné. */
export interface SetRules {
  points: number;
  winBy: WinBy;
  cap: PointsCap;
}

/** Un format de match nommé : les règles du set et le point du changement de côté. */
export interface MatchFormat extends SetRules {
  points: PointsTarget;
  sideChangeAt: SideChangeAt;
}

/**
 * LE FORMAT STANDARD, dit « 3 × 15 » : deux sets gagnants de 15 points, deux
 * points d'écart dès 14-14, plafond à 21 (à 20-20, le 21e point gagne le set),
 * changement de côté à 8 au set décisif.
 */
export const FORMAT_15 = {
  points: 15,
  winBy: 2,
  cap: 21,
  sideChangeAt: 8,
} as const satisfies MatchFormat;

/**
 * LE FORMAT EN 21 POINTS, gardé comme alternative : la BWF le conserve en
 * format à choisir d'avance, la FFBaD pour le Promobad. Deux points d'écart
 * dès 20-20, plafond à 30, changement de côté à 11 au set décisif.
 */
export const FORMAT_21 = {
  points: 21,
  winBy: 2,
  cap: 30,
  sideChangeAt: 11,
} as const satisfies MatchFormat;

/**
 * Un match qui ne dit rien de l'écart (enregistré avant ce réglage) se joue
 * avec deux points : c'était la seule règle que l'app appliquait.
 */
export const DEFAULT_WIN_BY = 2;

/**
 * Le point du changement de côté d'avant ce réglage, codé en dur. Un match
 * `'mid-match'` enregistré sans point le garde : c'est ce que son joueur avait
 * choisi, sous le libellé « Mi-match (à 11) ».
 */
export const LEGACY_SIDE_CHANGE_AT = 11;

/** Le format officiel qui se joue en ces points, s'il y en a un. */
export function officialFormat(points: number): MatchFormat | null {
  if (points === FORMAT_15.points) return FORMAT_15;
  if (points === FORMAT_21.points) return FORMAT_21;
  return null;
}

/** Les règles du set d'un match, écart par défaut compris. */
export function setRulesOf(
  config: Pick<MatchConfig, 'points' | 'winBy' | 'cap'>
): SetRules {
  return {
    points: config.points,
    winBy: config.winBy ?? DEFAULT_WIN_BY,
    cap: config.cap,
  };
}

/**
 * Le camp A a-t-il gagné le set à `scoreA`-`scoreB` ?
 *
 * Le plafond passe devant l'écart : à 20-20 en 15 points, le 21e point gagne
 * le set avec un seul point d'avance.
 */
export function isSetWon(
  scoreA: number,
  scoreB: number,
  rules: SetRules
): boolean {
  if (rules.cap !== null && scoreA >= rules.cap && scoreA > scoreB) return true;
  return scoreA >= rules.points && scoreA - scoreB >= rules.winBy;
}

/** Le prochain point du camp A lui donnerait-il le set ? */
export function isSetPoint(
  scoreA: number,
  scoreB: number,
  rules: SetRules
): boolean {
  return isSetWon(scoreA + 1, scoreB, rules);
}

/**
 * Le set en cours est-il le set décisif ? C'est celui où les deux camps n'ont
 * plus qu'un set à gagner : le troisième à 1-1 en deux sets gagnants, et le
 * seul d'un match en un set, que les Lois traitent comme un troisième set.
 */
export function isDecidingSet(
  setWins: { team1: number; team2: number },
  setsToWin: number
): boolean {
  return setWins.team1 === setsToWin - 1 && setWins.team2 === setsToWin - 1;
}

/**
 * Le score qui déclenche le changement de côté DANS le set en cours, quand un
 * camp l'atteint le premier, ou `null` s'il n'y en a pas dans ce set.
 *
 * - `'mid-match'` : à chaque set, au point choisi (11 pour un match enregistré
 *   avant ce réglage).
 * - `'each-set'` et `'decisive'` : au set décisif seulement, et seulement si
 *   le match porte un point. `'each-set'` avec un point, c'est la règle des
 *   Lois : à la fin du premier set, avant le troisième, et à 8 (11 en
 *   21 points) dans le troisième. Sans point, aucun changement en cours de
 *   set : c'était le comportement de ces deux réglages.
 *
 * Un point qui n'est pas sous les points du set ne tomberait qu'en
 * prolongation, à 11-10 dans un set de 11 : aucun rappel dans ce cas.
 */
export function midSetSideChangeAt(
  config: Pick<MatchConfig, 'points' | 'sets' | 'sideChange' | 'sideChangeAt'>,
  setWins: { team1: number; team2: number }
): SideChangeAt | null {
  let at: SideChangeAt | null;
  if (config.sideChange === 'mid-match') {
    at = config.sideChangeAt ?? LEGACY_SIDE_CHANGE_AT;
  } else if (isDecidingSet(setWins, config.sets)) {
    at = config.sideChangeAt ?? null;
  } else {
    at = null;
  }
  return at !== null && at < config.points ? at : null;
}
