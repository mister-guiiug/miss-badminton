import { useEffect, useId, useRef, useState } from 'react';
import type { ReactElement } from 'react';

export type MatchType = 'singles' | 'doubles';
export type SetCount = 1 | 2 | 3 | 5;
export type PointsTarget = 15 | 21 | 30 | 31;
export type SideChange = 'decisive' | 'each-set' | 'mid-match';

export interface Team {
  primary: string;
  partner?: string;
}

export interface MatchConfig {
  type: MatchType;
  sets: SetCount;
  points: PointsTarget;
  sideChange: SideChange;
  team1: Team;
  team2: Team;
}

interface WizardDraft {
  type: MatchType | null;
  sets: SetCount;
  points: PointsTarget;
  sideChange: SideChange;
  team1: { primary: string; partner: string };
  team2: { primary: string; partner: string };
}

const DEFAULT_DRAFT: WizardDraft = {
  type: null,
  sets: 3,
  points: 21,
  sideChange: 'each-set',
  team1: { primary: '', partner: '' },
  team2: { primary: '', partner: '' },
};

function draftFromConfig(config: MatchConfig): WizardDraft {
  return {
    type: config.type,
    sets: config.sets,
    points: config.points,
    sideChange: config.sideChange,
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

  const finish = () => {
    if (!draft.type) return;
    const isDoubles = draft.type === 'doubles';
    onComplete({
      type: draft.type,
      sets: draft.sets,
      points: draft.points,
      sideChange: draft.sideChange,
      team1: {
        primary: draft.team1.primary.trim() || 'joueur 1',
        partner: isDoubles
          ? draft.team1.partner.trim() || 'partenaire 1'
          : undefined,
      },
      team2: {
        primary: draft.team2.primary.trim() || 'joueur 2',
        partner: isDoubles
          ? draft.team2.partner.trim() || 'partenaire 2'
          : undefined,
      },
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
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
        className="relative z-10 flex w-full max-w-lg flex-col gap-5 rounded-2xl p-6 shadow-2xl outline-none"
        style={{ background: 'var(--surface)', color: 'var(--text)' }}
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <p
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: 'var(--muted)' }}
            >
              Étape {step} / 3
            </p>
            <h2 id={titleId} className="text-xl font-bold">
              {step === 1 && 'Type de match'}
              {step === 2 && 'Règles'}
              {step === 3 && 'Joueurs'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Fermer l'assistant"
            className="rounded-md px-2 py-1 text-xl leading-none hover:bg-black/5"
            style={{ color: 'var(--muted)' }}
          >
            ×
          </button>
        </header>

        <StepIndicator current={step} />

        {step === 1 && (
          <Step1
            value={draft.type}
            onChange={type => setDraft(d => ({ ...d, type }))}
          />
        )}
        {step === 2 && (
          <Step2
            sets={draft.sets}
            points={draft.points}
            sideChange={draft.sideChange}
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
              className="rounded-xl px-5 py-2 text-sm font-semibold"
              style={{
                background: 'var(--surface-highlight)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
            >
              Retour
            </button>
          ) : (
            <span />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep(s => (s + 1) as 1 | 2 | 3)}
              disabled={step === 1 && !canNextStep1}
              className="rounded-xl px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: 'var(--primary)' }}
            >
              Suivant
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              className="rounded-xl px-5 py-2 text-sm font-semibold text-white"
              style={{ background: 'var(--primary)' }}
            >
              Commencer
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

interface Step1Props {
  value: MatchType | null;
  onChange: (value: MatchType) => void;
}

function Step1({ value, onChange }: Step1Props) {
  return (
    <fieldset className="grid grid-cols-2 gap-3">
      <legend className="sr-only">Type de match</legend>
      <OptionCard
        selected={value === 'singles'}
        onClick={() => onChange('singles')}
        title="Seul"
        subtitle="Simple — 1 vs 1"
      />
      <OptionCard
        selected={value === 'doubles'}
        onClick={() => onChange('doubles')}
        title="En double"
        subtitle="Double — 2 vs 2"
      />
    </fieldset>
  );
}

interface Step2Props {
  sets: SetCount;
  points: PointsTarget;
  sideChange: SideChange;
  onChange: (
    patch: Partial<Pick<WizardDraft, 'sets' | 'points' | 'sideChange'>>
  ) => void;
}

const SET_OPTIONS: SetCount[] = [1, 2, 3, 5];
const POINT_OPTIONS: PointsTarget[] = [15, 21, 30, 31];
const SIDE_CHANGE_OPTIONS: { value: SideChange; label: string }[] = [
  { value: 'decisive', label: 'Set décisif uniquement' },
  { value: 'each-set', label: 'Chaque set' },
  { value: 'mid-match', label: 'Mi-match' },
];

function Step2({ sets, points, sideChange, onChange }: Step2Props) {
  return (
    <div className="flex flex-col gap-4">
      <PillGroup
        label="Nombre de sets"
        value={sets}
        options={SET_OPTIONS.map(v => ({ value: v, label: `${v}` }))}
        onChange={v => onChange({ sets: v })}
      />
      <PillGroup
        label="Points par set"
        value={points}
        options={POINT_OPTIONS.map(v => ({ value: v, label: `${v}` }))}
        onChange={v => onChange({ points: v })}
      />
      <PillGroup
        label="Changement de côté"
        value={sideChange}
        options={SIDE_CHANGE_OPTIONS}
        onChange={v => onChange({ sideChange: v })}
      />
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
  const isDoubles = matchType === 'doubles';
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <TeamFieldset
        title="Équipe rouge"
        accent="#e53935"
        isDoubles={isDoubles}
        primary={team1.primary}
        partner={team1.partner}
        primaryPlaceholder="joueur 1"
        partnerPlaceholder="partenaire 1"
        onPrimary={v =>
          onChange({ team1: { primary: v, partner: team1.partner } })
        }
        onPartner={v =>
          onChange({ team1: { primary: team1.primary, partner: v } })
        }
      />
      <TeamFieldset
        title="Équipe bleue"
        accent="#26a3b8"
        isDoubles={isDoubles}
        primary={team2.primary}
        partner={team2.partner}
        primaryPlaceholder="joueur 2"
        partnerPlaceholder="partenaire 2"
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
      />
      {isDoubles && (
        <PlayerField
          value={partner}
          placeholder={partnerPlaceholder}
          ariaLabel={partnerPlaceholder}
          onChange={onPartner}
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
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

function PillGroup<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: PillGroupProps<T>) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
        {label}
      </span>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex flex-wrap gap-2"
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
              className="rounded-full border px-4 py-1.5 text-sm font-medium transition-colors"
              style={{
                borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                background: isSelected ? 'var(--primary)' : 'transparent',
                color: isSelected ? '#fff' : 'var(--text)',
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
}

function PlayerField({
  value,
  placeholder,
  ariaLabel,
  onChange,
}: PlayerFieldProps) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={e => onChange(e.target.value)}
      maxLength={40}
      className="rounded-xl border px-3 py-2 outline-none focus:ring-2"
      style={{
        background: 'var(--surface-input)',
        borderColor: 'var(--border)',
        color: 'var(--text)',
      }}
    />
  );
}
