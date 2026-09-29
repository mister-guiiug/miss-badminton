import { useEffect, useId, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useI18n } from '../../i18n';
import {
  DEFAULT_WIN_BY,
  FORMAT_15,
  FORMAT_21,
  LEGACY_SIDE_CHANGE_AT,
  officialFormat,
  type MatchFormat,
} from '../../scoring';
import { storage } from '../../storage';

export type MatchType = 'singles' | 'doubles';
/**
 * Nombre de sets gagnants nécessaires pour remporter le match.
 * - 1 = best of 1
 * - 2 = best of 3 (format standard badminton)
 * - 3 = best of 5
 * - 5 = best of 9
 */
export type SetCount = 1 | 2 | 3 | 5;
export type PointsTarget = 5 | 11 | 15 | 21 | 30 | 31;
export type SideChange = 'decisive' | 'each-set' | 'mid-match';
/** Plafond de score d'un set, indépendamment de la règle des 2 points. */
export type PointsCap = number | null;
/**
 * Les points d'avance qu'il faut pour gagner un set : 2 dans les deux formats
 * officiels, 1 pour un set sans prolongation.
 */
export type WinBy = number;
/**
 * Le score qui déclenche le changement de côté EN COURS de set, quand un camp
 * l'atteint le premier : 8 en 15 points, 11 en 21 points. Le set où il
 * s'applique dépend de `SideChange` (cf. `midSetSideChangeAt`).
 */
export type SideChangeAt = number;
/** Limite de temps en minutes (par set ou par match selon le contexte). */
export type TimeLimitMin = number | null;
/**
 * Comportement quand un set atteint la limite de temps OU le plafond
 * sans qu'aucune équipe ne soit en tête de 2 :
 * - 'none' : on s'arrête, victoire à qui mène ; égalité = pas de gagnant
 * - 'sudden-death' : un point supplémentaire départage
 */
export type TieBreak = 'none' | 'sudden-death';

export interface Team {
  primary: string;
  partner?: string;
  /**
   * Identifiant d'origine de l'ÉQUIPE ('A' = équipe créée à gauche du wizard,
   * 'B' = équipe créée à droite). Sert de fallback stable pour l'affichage :
   * quand l'utilisateur permute les côtés, l'id suit l'équipe et permet aux
   * libellés par défaut ("Joueur A" / "Joueur B") de changer visiblement
   * même si l'utilisateur n'a pas saisi de nom.
   *
   * CE N'EST PAS L'IDENTIFIANT D'UN JOUEUR : voir `primaryId` / `partnerId`.
   */
  id?: 'A' | 'B';
  /** Identifiant stable du profil du joueur principal (cf. `players.ts`). */
  primaryId?: string;
  /** Identifiant stable du profil du partenaire (double uniquement). */
  partnerId?: string;
}

export interface MatchConfig {
  type: MatchType;
  sets: SetCount;
  points: PointsTarget;
  /**
   * Optionnel : l'écart pour gagner un set. Absent (match enregistré avant ce
   * réglage) : 2, la seule règle que l'app appliquait.
   */
  winBy?: WinBy;
  cap: PointsCap;
  sideChange: SideChange;
  /**
   * Optionnel : le point du changement de côté en cours de set. Avec
   * `'mid-match'`, il vaut pour chaque set ; avec `'each-set'` ou
   * `'decisive'`, pour le set décisif seulement. `'each-set'` et ce point,
   * c'est la règle des Lois : fin du premier set, avant le troisième, et à 8
   * dans le troisième.
   *
   * DEUX CHAMPS OPTIONNELS PLUTÔT QU'UNE VALEUR DE PLUS DANS `SideChange`.
   * Une version antérieure de l'app valide `sideChange` contre sa propre
   * liste : une valeur qu'elle ne connaît pas lui ferait rejeter tout
   * l'historique qui la porte. Un champ qu'elle ne connaît pas, zod le retire
   * à la lecture, et le match se joue avec les changements entre les sets.
   *
   * Absent (match enregistré avant ce réglage) : 11 pour `'mid-match'`,
   * aucun changement en cours de set pour les deux autres.
   */
  sideChangeAt?: SideChangeAt;
  team1: Team;
  team2: Team;
  /**
   * Optionnel : durée maximale d'un set en minutes. À l'épuisement, le set
   * est attribué selon `tieBreak`. Compatible avec l'ancien format (absent).
   */
  timeLimitMin?: TimeLimitMin;
  /** Optionnel : comportement de départage. Défaut implicite : 'none'. */
  tieBreak?: TieBreak;
}

/**
 * Le changement de côté tel que l'assistant le PROPOSE. `'official'` n'est pas
 * stocké : `finish` l'écrit `'each-set'` avec un `sideChangeAt` (voir
 * `MatchConfig.sideChangeAt` pour la raison).
 */
type SideChangeChoice = 'official' | SideChange;

interface WizardDraft {
  type: MatchType | null;
  sets: SetCount;
  points: PointsTarget;
  winBy: WinBy;
  cap: PointsCap;
  sideChange: SideChangeChoice;
  /** Gardé même quand le choix n'en use pas : il revient si l'on y retourne. */
  sideChangeAt: SideChangeAt;
  timeLimitMin: TimeLimitMin;
  tieBreak: TieBreak;
  team1: { primary: string; partner: string };
  team2: { primary: string; partner: string };
}

/**
 * Les règles d'un format nommé, prêtes pour le brouillon. Le changement de
 * côté est celui des Lois : fin de chaque set, et au set décisif.
 */
function draftRules(
  format: MatchFormat
): Pick<
  WizardDraft,
  'points' | 'winBy' | 'cap' | 'sideChange' | 'sideChangeAt'
> {
  return {
    points: format.points,
    winBy: format.winBy,
    cap: format.cap,
    sideChange: 'official',
    sideChangeAt: format.sideChangeAt,
  };
}

/** Un nouveau match part du format standard, le 3 × 15. */
const DEFAULT_DRAFT: WizardDraft = {
  type: null,
  sets: 2,
  ...draftRules(FORMAT_15),
  timeLimitMin: null,
  tieBreak: 'none',
  team1: { primary: '', partner: '' },
  team2: { primary: '', partner: '' },
};

function draftFromConfig(config: MatchConfig): WizardDraft {
  return {
    type: config.type,
    sets: config.sets,
    points: config.points,
    winBy: config.winBy ?? DEFAULT_WIN_BY,
    cap: config.cap ?? null,
    sideChange:
      config.sideChange === 'each-set' && config.sideChangeAt !== undefined
        ? 'official'
        : config.sideChange,
    // Un match `'mid-match'` sans point se jouait à 11, et c'est ce qu'on lui
    // rend. Pour les autres, le point n'est qu'une proposition, prise dans le
    // format officiel de ses points quand il y en a un.
    sideChangeAt:
      config.sideChangeAt ??
      (config.sideChange === 'mid-match'
        ? LEGACY_SIDE_CHANGE_AT
        : (officialFormat(config.points)?.sideChangeAt ??
          LEGACY_SIDE_CHANGE_AT)),
    timeLimitMin: config.timeLimitMin ?? null,
    tieBreak: config.tieBreak ?? 'none',
    team1: {
      primary: config.team1.primary,
      partner: config.team1.partner ?? '',
    },
    team2: {
      primary: config.team2.primary,
      partner: config.team2.partner ?? '',
    },
  };
}

/** Ce que le match enregistre du changement de côté choisi. */
function sideChangeOf(
  draft: WizardDraft
): Pick<MatchConfig, 'sideChange' | 'sideChangeAt'> {
  switch (draft.sideChange) {
    case 'official':
      return { sideChange: 'each-set', sideChangeAt: draft.sideChangeAt };
    case 'mid-match':
      return { sideChange: 'mid-match', sideChangeAt: draft.sideChangeAt };
    default:
      return { sideChange: draft.sideChange, sideChangeAt: undefined };
  }
}

interface MatchSetupWizardProps {
  initial?: MatchConfig | null;
  onCancel: () => void;
  onComplete: (config: MatchConfig) => void;
}

export function MatchSetupWizard({
  initial,
  onCancel,
  onComplete,
}: MatchSetupWizardProps): ReactElement {
  const { t } = useI18n();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [draft, setDraft] = useState<WizardDraft>(() =>
    initial ? draftFromConfig(initial) : { ...DEFAULT_DRAFT }
  );
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousActive = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previousActive?.focus?.();
    };
  }, [onCancel]);

  const canNextStep1 = draft.type !== null;

  // Un format nommé passe l'étape des règles : un simple en deux sets
  // gagnants, sans limite de temps — rien d'un match rejoué ne s'y ajoute.
  const startWith = (format: MatchFormat) => {
    setDraft(d => ({
      ...d,
      type: 'singles',
      sets: 2,
      ...draftRules(format),
      timeLimitMin: null,
      tieBreak: 'none',
    }));
    setStep(3);
  };

  const finish = () => {
    if (!draft.type) return;
    const isDoubles = draft.type === 'doubles';
    // Un nom saisi devient un PROFIL, et le match portera son identifiant :
    // c'est ce qui rend « tous mes matchs contre X » et le renommage
    // possibles. `rememberPlayer` réutilise le profil existant quand le nom
    // est déjà connu (règle des homonymes, cf. `players.ts`).
    const remember = (s: string): string | undefined =>
      storage.rememberPlayer(s)?.id;
    const team1PrimaryId = remember(draft.team1.primary);
    const team2PrimaryId = remember(draft.team2.primary);
    const team1PartnerId = isDoubles
      ? remember(draft.team1.partner)
      : undefined;
    const team2PartnerId = isDoubles
      ? remember(draft.team2.partner)
      : undefined;
    // Conserve les id de CÔTÉ si on édite un match existant (pour ne pas
    // casser le sens "A/B" déjà associé aux équipes après un éventuel swap).
    const team1Id = initial?.team1.id ?? 'A';
    const team2Id = initial?.team2.id ?? 'B';
    onComplete({
      type: draft.type,
      sets: draft.sets,
      points: draft.points,
      winBy: draft.winBy,
      cap: draft.cap,
      ...sideChangeOf(draft),
      timeLimitMin: draft.timeLimitMin,
      tieBreak: draft.tieBreak,
      team1: {
        primary: draft.team1.primary.trim(),
        partner: isDoubles ? draft.team1.partner.trim() : undefined,
        id: team1Id,
        primaryId: team1PrimaryId,
        partnerId: team1PartnerId,
      },
      team2: {
        primary: draft.team2.primary.trim(),
        partner: isDoubles ? draft.team2.partner.trim() : undefined,
        id: team2Id,
        primaryId: team2PrimaryId,
        partnerId: team2PartnerId,
      },
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="presentation"
      style={{
        padding: 'max(env(safe-area-inset-top), 1rem)',
        paddingInlineStart: 'max(env(safe-area-inset-left), 1rem)',
        paddingInlineEnd: 'max(env(safe-area-inset-right), 1rem)',
        paddingBlockEnd: 'max(env(safe-area-inset-bottom), 1rem)',
      }}
    >
      <div
        className="absolute inset-0 bg-black/55"
        onClick={onCancel}
        aria-hidden
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative z-10 flex max-h-full w-full max-w-lg flex-col gap-5 overflow-y-auto rounded-2xl shadow-2xl outline-none md:max-w-2xl"
        style={{
          background: 'var(--surface)',
          color: 'var(--text)',
          padding: 'clamp(1rem, 3.2vw, 1.75rem)',
        }}
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <p
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: 'var(--muted)' }}
            >
              {t('wizard.stepLabel', { n: step })}
            </p>
            <h2
              id={titleId}
              className="font-bold"
              style={{ fontSize: 'clamp(1.125rem, 3.2vw, 1.5rem)' }}
            >
              {step === 1 && t('wizard.typeTitle')}
              {step === 2 && t('wizard.rulesTitle')}
              {step === 3 && t('wizard.playersTitle')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label={t('wizard.closeLabel')}
            className="flex touch-target items-center justify-center rounded-md text-xl leading-none hover:bg-black/5"
            style={{ color: 'var(--muted)' }}
          >
            ×
          </button>
        </header>

        <StepIndicator current={step} />

        {step === 1 && (
          <>
            {/*
             * DEUX FORMATS NOMMÉS, chacun en un toucher. Le « Match standard »
             * est le 3 × 15 : la FFBaD le joue depuis le 1er septembre 2026,
             * les Lois de la BWF le prennent le 4 janvier 2027. Le 21 points,
             * qui était le standard jusque-là, reste à portée en second : la
             * BWF le garde en format alternatif, la FFBaD pour le Promobad.
             */}
            <div className="flex flex-col gap-2">
              <QuickStart
                icon="⚡"
                title={t('wizardExtra.quickStart')}
                hint={t('wizardExtra.quickStartHint', {
                  points: FORMAT_15.points,
                  cap: FORMAT_15.cap,
                })}
                emphasis
                onClick={() => startWith(FORMAT_15)}
              />
              <QuickStart
                title={t('wizardExtra.quickStartAlt')}
                hint={t('wizardExtra.quickStartHint', {
                  points: FORMAT_21.points,
                  cap: FORMAT_21.cap,
                })}
                onClick={() => startWith(FORMAT_21)}
              />
            </div>
            <Step1
              value={draft.type}
              onChange={type => setDraft(d => ({ ...d, type }))}
            />
          </>
        )}
        {step === 2 && (
          <Step2
            sets={draft.sets}
            points={draft.points}
            winBy={draft.winBy}
            cap={draft.cap}
            sideChange={draft.sideChange}
            sideChangeAt={draft.sideChangeAt}
            timeLimitMin={draft.timeLimitMin}
            tieBreak={draft.tieBreak}
            onChange={patch => setDraft(d => ({ ...d, ...patch }))}
          />
        )}
        {step === 3 && (
          <Step3
            matchType={draft.type ?? 'singles'}
            team1={draft.team1}
            team2={draft.team2}
            onChange={patch => setDraft(d => ({ ...d, ...patch }))}
          />
        )}

        <footer className="mt-2 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(s => (s - 1) as 1 | 2 | 3)}
              className="inline-flex min-h-11 items-center rounded-xl px-5 py-2 text-sm font-semibold"
              style={{
                background: 'var(--surface-highlight)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
            >
              {t('wizard.back')}
            </button>
          ) : (
            <span />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep(s => (s + 1) as 1 | 2 | 3)}
              disabled={step === 1 && !canNextStep1}
              className="inline-flex min-h-11 items-center rounded-xl px-5 py-2 text-sm font-semibold text-[var(--primary-ink)] disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: 'var(--primary)' }}
            >
              {t('wizard.next')}
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              className="inline-flex min-h-11 items-center rounded-xl px-5 py-2 text-sm font-semibold text-[var(--primary-ink)]"
              style={{ background: 'var(--primary)' }}
            >
              {t('wizard.start')}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-2" aria-hidden>
      {[1, 2, 3].map(n => (
        <span
          key={n}
          className="h-1.5 flex-1 rounded-full transition-colors"
          style={{
            background: n <= current ? 'var(--primary)' : 'var(--border)',
          }}
        />
      ))}
    </div>
  );
}

interface QuickStartProps {
  title: string;
  hint: string;
  /** Décoratif : tenu hors du nom accessible du bouton. */
  icon?: string;
  /** Le format standard est mis en avant ; l'alternative reste en retrait. */
  emphasis?: boolean;
  onClick: () => void;
}

function QuickStart({
  title,
  hint,
  icon,
  emphasis = false,
  onClick,
}: QuickStartProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-black/[0.03] ${emphasis ? 'border-2 border-dashed' : 'border'}`}
      style={{ borderColor: emphasis ? 'var(--primary)' : 'var(--border)' }}
    >
      <span>
        <span
          className="block text-sm font-bold"
          style={{ color: emphasis ? 'var(--primary)' : 'var(--text)' }}
        >
          {icon && <span aria-hidden>{icon} </span>}
          {title}
        </span>
        <span className="block text-xs" style={{ color: 'var(--muted)' }}>
          {hint}
        </span>
      </span>
      <span aria-hidden className="text-xl">
        →
      </span>
    </button>
  );
}

interface Step1Props {
  value: MatchType | null;
  onChange: (value: MatchType) => void;
}

function Step1({ value, onChange }: Step1Props) {
  const { t } = useI18n();
  return (
    <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <legend className="sr-only">{t('wizard.typeTitle')}</legend>
      <OptionCard
        selected={value === 'singles'}
        onClick={() => onChange('singles')}
        title={t('wizard.singlesTitle')}
        subtitle={t('wizard.singlesSubtitle')}
      />
      <OptionCard
        selected={value === 'doubles'}
        onClick={() => onChange('doubles')}
        title={t('wizard.doublesTitle')}
        subtitle={t('wizard.doublesSubtitle')}
      />
    </fieldset>
  );
}

interface Step2Props {
  sets: SetCount;
  points: PointsTarget;
  winBy: WinBy;
  cap: PointsCap;
  sideChange: SideChangeChoice;
  sideChangeAt: SideChangeAt;
  timeLimitMin: TimeLimitMin;
  tieBreak: TieBreak;
  onChange: (
    patch: Partial<
      Pick<
        WizardDraft,
        | 'sets'
        | 'points'
        | 'winBy'
        | 'cap'
        | 'sideChange'
        | 'sideChangeAt'
        | 'timeLimitMin'
        | 'tieBreak'
      >
    >
  ) => void;
}

const SET_OPTIONS: SetCount[] = [1, 2, 3, 5];
const POINT_OPTIONS: PointsTarget[] = [5, 11, 15, 21, 30, 31];
const WIN_BY_OPTIONS: WinBy[] = [1, 2];
/** `null` = sans plafond ; 21 et 30, les plafonds des deux formats officiels. */
const CAP_OPTIONS: PointsCap[] = [null, FORMAT_15.cap, FORMAT_21.cap];
const SIDE_CHANGE_OPTIONS: SideChangeChoice[] = [
  'official',
  'each-set',
  'decisive',
  'mid-match',
];
const SIDE_CHANGE_AT_OPTIONS: SideChangeAt[] = [
  FORMAT_15.sideChangeAt,
  FORMAT_21.sideChangeAt,
];
/** Options de durée de set en minutes ; `null` = pas de limite de temps. */
const TIME_LIMIT_OPTIONS: TimeLimitMin[] = [null, 5, 10, 15, 20];

/**
 * Choisir 15 ou 21 points, c'est choisir le FORMAT : l'écart, le plafond et le
 * point du changement de côté suivent, et chacun reste modifiable ensuite.
 * Pour les autres scores, on ne retire qu'un plafond qui ne serait plus
 * au-dessus des points.
 */
function rulesForPoints(
  points: PointsTarget,
  cap: PointsCap
): Partial<Pick<WizardDraft, 'winBy' | 'cap' | 'sideChangeAt'>> {
  const format = officialFormat(points);
  if (format) {
    return {
      winBy: format.winBy,
      cap: format.cap,
      sideChangeAt: format.sideChangeAt,
    };
  }
  return { cap: cap !== null && cap > points ? cap : null };
}

function Step2({
  sets,
  points,
  winBy,
  cap,
  sideChange,
  sideChangeAt,
  timeLimitMin,
  tieBreak,
  onChange,
}: Step2Props) {
  const { t } = useI18n();
  const sideChangeLabels: Record<SideChangeChoice, string> = {
    official: t('wizard.sideChangeOfficial'),
    'each-set': t('wizard.sideChangeEachSet'),
    decisive: t('wizard.sideChangeDecisive'),
    'mid-match': t('wizard.sideChangeMidMatch'),
  };
  // L'aide dit ce que fait le choix EN COURS, point compris : « à 8 » se lit
  // là où l'on choisit, pas seulement dans le résumé.
  const sideChangeHelps: Record<SideChangeChoice, string> = {
    official: t('wizard.sideChangeOfficialHelp', { n: sideChangeAt }),
    'each-set': t('wizard.sideChangeEachSetHelp'),
    decisive: t('wizard.sideChangeDecisiveHelp'),
    'mid-match': t('wizard.sideChangeMidMatchHelp', { n: sideChangeAt }),
  };
  const usesSideChangeAt =
    sideChange === 'official' || sideChange === 'mid-match';
  // Un plafond qui n'est pas au-dessus des points couperait le set avant
  // son terme : il n'est pas proposé.
  const capOptions: { value: string; label: string }[] = CAP_OPTIONS.filter(
    c => c === null || c > points
  ).map(c => ({
    value: c === null ? 'none' : String(c),
    label: c === null ? t('wizard.capNone') : t('wizard.capValue', { n: c }),
  }));
  const capKey = cap === null ? 'none' : String(cap);
  const timeOptions: { value: string; label: string }[] =
    TIME_LIMIT_OPTIONS.map(v => ({
      value: v === null ? 'none' : String(v),
      label:
        v === null
          ? t('wizard.timeLimitNone')
          : t('wizard.timeLimitMin', { n: v }),
    }));
  const timeKey = timeLimitMin === null ? 'none' : String(timeLimitMin);
  const timeLabel =
    timeLimitMin === null
      ? t('wizard.timeLimitNone')
      : t('wizard.timeLimitMin', { n: timeLimitMin });
  const tieBreakOptions: { value: TieBreak; label: string }[] = [
    { value: 'none', label: t('wizard.tieBreakNone') },
    { value: 'sudden-death', label: t('wizard.tieBreakSudden') },
  ];
  const summaryItems = [
    t('wizard.setsWinning', { wins: sets }),
    `${points} pts`,
    t('wizard.summaryWinBy', { n: winBy }),
    cap === null
      ? t('wizard.summaryNoCap')
      : t('wizard.summaryCap', { n: cap }),
    usesSideChangeAt
      ? t('wizard.summarySideChangeAt', {
          label: sideChangeLabels[sideChange],
          n: sideChangeAt,
        })
      : sideChangeLabels[sideChange],
    timeLabel,
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Résumé en direct — toujours visible en haut de l'étape Règles */}
      <div
        role="status"
        aria-live="polite"
        className="rounded-xl border px-3 py-2"
        style={{
          background: 'var(--surface-highlight)',
          borderColor: 'var(--border)',
        }}
      >
        <p
          className="text-[0.65rem] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--muted)' }}
        >
          {t('wizard.summaryLabel')}
        </p>
        <p
          className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm font-medium"
          style={{ color: 'var(--text)' }}
        >
          {summaryItems.map((label, i) => (
            <span key={i} className="inline-flex items-center gap-1.5">
              {i > 0 && (
                <span aria-hidden style={{ color: 'var(--muted)' }}>
                  ·
                </span>
              )}
              <span>{label}</span>
            </span>
          ))}
        </p>
      </div>

      <PillGroup
        label={t('wizard.sets')}
        help={t('wizard.setsHelp', { wins: sets })}
        value={sets}
        options={SET_OPTIONS.map(v => ({ value: v, label: `${v}` }))}
        onChange={v => onChange({ sets: v })}
        equalWidth
      />
      <PillGroup
        label={t('wizard.points')}
        help={t('wizard.pointsHelp')}
        value={points}
        options={POINT_OPTIONS.map(v => ({ value: v, label: `${v}` }))}
        onChange={v => onChange({ points: v, ...rulesForPoints(v, cap) })}
        equalWidth
      />
      <PillGroup
        label={t('wizard.winBy')}
        help={t('wizard.winByHelp')}
        value={winBy}
        options={WIN_BY_OPTIONS.map(v => ({ value: v, label: `${v}` }))}
        onChange={v => onChange({ winBy: v })}
        equalWidth
      />
      <PillGroup
        label={t('wizard.cap')}
        help={t('wizard.capHelp')}
        value={capKey}
        options={capOptions}
        onChange={v => onChange({ cap: v === 'none' ? null : Number(v) })}
        equalWidth
      />
      <PillGroup
        label={t('wizard.sideChange')}
        help={sideChangeHelps[sideChange]}
        value={sideChange}
        options={SIDE_CHANGE_OPTIONS.map(v => ({
          value: v,
          label: sideChangeLabels[v],
        }))}
        onChange={v => onChange({ sideChange: v })}
      />
      {usesSideChangeAt && (
        <PillGroup
          label={t('wizard.sideChangeAt')}
          help={t('wizard.sideChangeAtHelp')}
          value={sideChangeAt}
          options={SIDE_CHANGE_AT_OPTIONS.map(v => ({
            value: v,
            label: `${v}`,
          }))}
          onChange={v => onChange({ sideChangeAt: v })}
          equalWidth
        />
      )}
      <PillGroup
        label={t('wizard.timeLimit')}
        help={t('wizard.timeLimitHelp')}
        value={timeKey}
        options={timeOptions}
        onChange={v =>
          onChange({ timeLimitMin: v === 'none' ? null : Number(v) })
        }
        equalWidth
      />
      {timeLimitMin !== null && (
        <PillGroup
          label={t('wizard.tieBreak')}
          help={t('wizard.tieBreakHelp')}
          value={tieBreak}
          options={tieBreakOptions}
          onChange={v => onChange({ tieBreak: v })}
          equalWidth
        />
      )}
    </div>
  );
}

interface Step3Props {
  matchType: MatchType;
  team1: { primary: string; partner: string };
  team2: { primary: string; partner: string };
  onChange: (patch: Partial<Pick<WizardDraft, 'team1' | 'team2'>>) => void;
}

function Step3({ matchType, team1, team2, onChange }: Step3Props) {
  const { t } = useI18n();
  const isDoubles = matchType === 'doubles';
  const datalistId = 'mb-player-suggestions';
  const suggestions = storage.loadPlayerNames();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <datalist id={datalistId}>
        {suggestions.map(name => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <TeamFieldset
        title={t('wizard.redTeam')}
        accent="#e53935"
        isDoubles={isDoubles}
        primary={team1.primary}
        partner={team1.partner}
        primaryPlaceholder={t('players.player1')}
        partnerPlaceholder={t('players.partner1')}
        listId={datalistId}
        onPrimary={v =>
          onChange({ team1: { primary: v, partner: team1.partner } })
        }
        onPartner={v =>
          onChange({ team1: { primary: team1.primary, partner: v } })
        }
      />
      <TeamFieldset
        title={t('wizard.blueTeam')}
        accent="#26a3b8"
        isDoubles={isDoubles}
        primary={team2.primary}
        partner={team2.partner}
        primaryPlaceholder={t('players.player2')}
        partnerPlaceholder={t('players.partner2')}
        listId={datalistId}
        onPrimary={v =>
          onChange({ team2: { primary: v, partner: team2.partner } })
        }
        onPartner={v =>
          onChange({ team2: { primary: team2.primary, partner: v } })
        }
      />
    </div>
  );
}

interface TeamFieldsetProps {
  title: string;
  accent: string;
  isDoubles: boolean;
  primary: string;
  partner: string;
  primaryPlaceholder: string;
  partnerPlaceholder: string;
  listId?: string;
  onPrimary: (value: string) => void;
  onPartner: (value: string) => void;
}

function TeamFieldset({
  title,
  accent,
  isDoubles,
  primary,
  partner,
  primaryPlaceholder,
  partnerPlaceholder,
  listId,
  onPrimary,
  onPartner,
}: TeamFieldsetProps) {
  return (
    <fieldset
      className="flex flex-col gap-2 rounded-xl border p-3"
      style={{ borderColor: 'var(--border)' }}
    >
      <legend
        className="flex items-center gap-2 px-1 text-sm font-semibold"
        style={{ color: 'var(--text)' }}
      >
        <span
          aria-hidden
          className="inline-block h-3 w-3 rounded-full"
          style={{ background: accent }}
        />
        {title}
      </legend>
      <PlayerField
        value={primary}
        placeholder={primaryPlaceholder}
        ariaLabel={primaryPlaceholder}
        onChange={onPrimary}
        listId={listId}
      />
      {isDoubles && (
        <PlayerField
          value={partner}
          placeholder={partnerPlaceholder}
          ariaLabel={partnerPlaceholder}
          onChange={onPartner}
          listId={listId}
        />
      )}
    </fieldset>
  );
}

interface OptionCardProps {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}

function OptionCard({ selected, onClick, title, subtitle }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="flex flex-col items-start gap-1 rounded-xl border-2 p-4 text-left transition-colors"
      style={{
        borderColor: selected ? 'var(--primary)' : 'var(--border)',
        background: selected ? 'var(--surface-highlight)' : 'transparent',
      }}
    >
      <span
        className="text-base font-semibold"
        style={{ color: 'var(--text)' }}
      >
        {title}
      </span>
      <span className="text-xs" style={{ color: 'var(--muted)' }}>
        {subtitle}
      </span>
    </button>
  );
}

interface PillGroupProps<T extends string | number> {
  label: string;
  help?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  /**
   * Si vrai, toutes les pills occupent une largeur égale (1fr) — pratique
   * pour les choix numériques type "segmented control" sur mobile.
   */
  equalWidth?: boolean;
}

function PillGroup<T extends string | number>({
  label,
  help,
  value,
  options,
  onChange,
  equalWidth,
}: PillGroupProps<T>) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-col">
        <span
          className="text-[0.7rem] font-semibold uppercase tracking-wide"
          style={{ color: 'var(--muted)' }}
        >
          {label}
        </span>
        {help && (
          <span
            className="text-xs leading-snug"
            style={{ color: 'var(--muted)' }}
          >
            {help}
          </span>
        )}
      </div>
      <div
        role="radiogroup"
        aria-label={label}
        className={equalWidth ? 'grid gap-2' : 'flex flex-wrap gap-2'}
        style={
          equalWidth
            ? {
                gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
              }
            : undefined
        }
      >
        {options.map(opt => {
          const isSelected = opt.value === value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(opt.value)}
              className={`inline-flex min-h-11 items-center justify-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${equalWidth ? 'w-full' : ''}`}
              style={{
                borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                background: isSelected ? 'var(--primary)' : 'transparent',
                color: isSelected ? 'var(--primary-ink)' : 'var(--text)',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface PlayerFieldProps {
  value: string;
  placeholder: string;
  ariaLabel: string;
  onChange: (value: string) => void;
  listId?: string;
}

function PlayerField({
  value,
  placeholder,
  ariaLabel,
  onChange,
  listId,
}: PlayerFieldProps) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={e => onChange(e.target.value)}
      maxLength={40}
      list={listId}
      autoComplete="off"
      className="min-h-11 rounded-xl border px-3 py-2 outline-none focus:ring-2"
      style={{
        background: 'var(--surface-input)',
        borderColor: 'var(--border)',
        color: 'var(--text)',
      }}
    />
  );
}
