import { useId, useState, type ReactNode } from 'react';
import { Sheet } from '@mister-guiiug/dev-pwa-config/react/sheet';
import { useI18n } from '../../i18n';
import {
  EBAD_DISCIPLINES,
  formatSets,
  isDoublesDiscipline,
  parseSets,
  type EbadDiscipline,
  type EbadMatch,
} from '../../ebad';
import type { EbadMatchInput } from '../../store/useEbadStore';

interface EbadMatchFormProps {
  /** Le match à modifier ; absent, le formulaire en crée un. */
  initial?: EbadMatch;
  tournaments: string[];
  players: string[];
  onCancel: () => void;
  onSave: (input: EbadMatchInput) => void;
}

const inputClass = 'w-full rounded-lg border px-3 py-2 text-base';
const inputStyle = {
  background: 'var(--surface-highlight)',
  borderColor: 'var(--border)',
  color: 'var(--text)',
} as const;

/** Un libellé relié à son champ par `htmlFor` (le champ porte `id`). */
function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 text-xs font-semibold">
      <label htmlFor={id} className="opacity-70">
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * LA SAISIE D'UN MATCH eBad, recopié depuis l'application de la fédération.
 *
 * Seuls le tournoi et un joueur par équipe sont obligatoires : c'est ce qu'il
 * faut pour préparer un match et le reconnaître ensuite. Le reste — tableau,
 * terrain, horaire, numéro — aide à s'y retrouver le jour du tournoi.
 *
 * L'ORDRE DES ÉQUIPES EST CELUI D'eBad, et c'est ce qui compte : le score à y
 * reporter est remis dans cet ordre, quel que soit le côté où chaque équipe a
 * été placée au moment de scorer.
 */
export function EbadMatchForm({
  initial,
  tournaments,
  players,
  onCancel,
  onSave,
}: EbadMatchFormProps) {
  const { t } = useI18n();
  const ids = useId();
  const tournamentsList = `${ids}-tournaments`;
  const playersList = `${ids}-players`;

  const [tournament, setTournament] = useState(
    initial?.tournament ?? tournaments[0] ?? ''
  );
  const [date, setDate] = useState(initial?.date ?? '');
  const [time, setTime] = useState(initial?.time ?? '');
  const [discipline, setDiscipline] = useState<EbadDiscipline>(
    initial?.discipline ?? 'SH'
  );
  const [round, setRound] = useState(initial?.round ?? '');
  const [court, setCourt] = useState(initial?.court ?? '');
  const [reference, setReference] = useState(initial?.reference ?? '');
  const [points, setPoints] = useState<15 | 21>(initial?.points ?? 15);
  const [t1p, setT1p] = useState(initial?.team1.primary ?? '');
  const [t1q, setT1q] = useState(initial?.team1.partner ?? '');
  const [t2p, setT2p] = useState(initial?.team2.primary ?? '');
  const [t2q, setT2q] = useState(initial?.team2.partner ?? '');
  const [reported, setReported] = useState(
    initial?.reportedScore ? formatSets(initial.reportedScore) : ''
  );
  const [error, setError] = useState<string | null>(null);

  const doubles = isDoublesDiscipline(discipline);

  const submit = () => {
    if (!tournament.trim() || !t1p.trim() || !t2p.trim()) {
      setError(t('ebad.required'));
      return;
    }
    const reportedScore = parseSets(reported);
    if (reportedScore === null) {
      setError(t('ebad.reportedScoreInvalid'));
      return;
    }
    onSave({
      tournament,
      date,
      time,
      discipline,
      round,
      court,
      reference,
      points,
      team1: { primary: t1p, partner: doubles ? t1q : undefined },
      team2: { primary: t2p, partner: doubles ? t2q : undefined },
      reportedScore,
      linkedMatchId: initial?.linkedMatchId,
    });
  };

  const teamFields = (
    fid: string,
    legend: string,
    primary: string,
    setPrimary: (v: string) => void,
    partner: string,
    setPartner: (v: string) => void
  ) => (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-bold">{legend}</legend>
      <div className={`grid gap-2 ${doubles ? 'sm:grid-cols-2' : ''}`}>
        <Field id={`${ids}-f1${fid}`} label={t('ebad.player')}>
          <input
            id={`${ids}-f1${fid}`}
            type="text"
            list={playersList}
            value={primary}
            onChange={e => setPrimary(e.target.value)}
            autoComplete="off"
            className={inputClass}
            style={inputStyle}
          />
        </Field>
        {doubles && (
          <Field id={`${ids}-f2${fid}`} label={t('ebad.partner')}>
            <input
              id={`${ids}-f2${fid}`}
              type="text"
              list={playersList}
              value={partner}
              onChange={e => setPartner(e.target.value)}
              autoComplete="off"
              className={inputClass}
              style={inputStyle}
            />
          </Field>
        )}
      </div>
    </fieldset>
  );

  return (
    <Sheet
      open
      title={initial ? t('ebad.formTitleEdit') : t('ebad.formTitleAdd')}
      closeLabel={t('ebad.cancel')}
      onClose={onCancel}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border px-3 py-1.5 text-sm font-semibold"
            style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
          >
            {t('ebad.cancel')}
          </button>
          <button
            type="button"
            onClick={submit}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-[var(--primary-ink)]"
            style={{ background: 'var(--primary)' }}
          >
            {t('ebad.save')}
          </button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={e => {
          e.preventDefault();
          submit();
        }}
      >
        <datalist id={tournamentsList}>
          {tournaments.map(name => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <datalist id={playersList}>
          {players.map(name => (
            <option key={name} value={name} />
          ))}
        </datalist>

        <Field id={`${ids}-f3`} label={t('ebad.tournament')}>
          <input
            id={`${ids}-f3`}
            type="text"
            list={tournamentsList}
            value={tournament}
            onChange={e => setTournament(e.target.value)}
            autoComplete="off"
            className={inputClass}
            style={inputStyle}
          />
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field id={`${ids}-f4`} label={t('ebad.date')}>
            <input
              id={`${ids}-f4`}
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </Field>
          <Field id={`${ids}-f5`} label={t('ebad.time')}>
            <input
              id={`${ids}-f5`}
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field id={`${ids}-f6`} label={t('ebad.discipline')}>
            <select
              id={`${ids}-f6`}
              value={discipline}
              onChange={e => setDiscipline(e.target.value as EbadDiscipline)}
              className={inputClass}
              style={inputStyle}
            >
              {EBAD_DISCIPLINES.map(d => (
                <option key={d} value={d}>
                  {d} — {t(`ebad.discipline${d}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field id={`${ids}-f7`} label={t('ebad.format')}>
            <select
              id={`${ids}-f7`}
              value={points}
              onChange={e => setPoints(e.target.value === '21' ? 21 : 15)}
              className={inputClass}
              style={inputStyle}
            >
              <option value="15">{t('ebad.format15')}</option>
              <option value="21">{t('ebad.format21')}</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Field id={`${ids}-f8`} label={t('ebad.round')}>
            <input
              id={`${ids}-f8`}
              type="text"
              value={round}
              placeholder={t('ebad.roundPlaceholder')}
              onChange={e => setRound(e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </Field>
          <Field id={`${ids}-f9`} label={t('ebad.court')}>
            <input
              id={`${ids}-f9`}
              type="text"
              inputMode="numeric"
              value={court}
              onChange={e => setCourt(e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </Field>
          <Field id={`${ids}-f10`} label={t('ebad.reference')}>
            <input
              id={`${ids}-f10`}
              type="text"
              value={reference}
              onChange={e => setReference(e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </Field>
        </div>

        {teamFields('a', t('ebad.team1'), t1p, setT1p, t1q, setT1q)}
        {teamFields('b', t('ebad.team2'), t2p, setT2p, t2q, setT2q)}

        <Field id={`${ids}-f11`} label={t('ebad.reportedScore')}>
          <input
            id={`${ids}-f11`}
            type="text"
            value={reported}
            placeholder={t('ebad.reportedScoreHint')}
            onChange={e => setReported(e.target.value)}
            autoComplete="off"
            className={inputClass}
            style={inputStyle}
          />
        </Field>

        {error && (
          <p role="alert" className="text-sm font-semibold text-red-600">
            {error}
          </p>
        )}
        {/* Valider au clavier (Entrée) sans dupliquer le bouton du pied. */}
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}
