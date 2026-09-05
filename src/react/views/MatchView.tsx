import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RiveScene } from '../components/RiveScene';
import {
  MatchSetupWizard,
  type MatchConfig,
  type PointsCap,
  type Team,
} from '../components/MatchSetupWizard';
import { FullscreenPrompt } from '../components/FullscreenPrompt';
import { CourtOverlay } from '../components/CourtOverlay';
import { SideChangeBanner } from '../components/SideChangeBanner';
import { SetTransitionBanner } from '../components/SetTransitionBanner';
import { PwaInstallPrompt } from '../components/PwaInstallPrompt';
import { useI18n } from '../../i18n';
import { useFeedback } from '../hooks/useFeedback';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useTeamColors } from '../hooks/useTeamColors';
import { useTapOrLongPress } from '../hooks/useTapOrLongPress';
import { ScoreToast } from '../components/ScoreToast';
import { ConfirmDialog } from '@mister-guiiug/dev-pwa-config/react/confirm-dialog';
import { shareOrCopy } from '@mister-guiiug/dev-pwa-config/share';
import { OnboardingHint } from '../components/OnboardingHint';
import { Logo } from '../components/Logo';
import { MatchDuration } from '../components/MatchDuration';
import { SetCountdown } from '../components/SetCountdown';
import {
  ArrowLeftRightIcon,
  ArrowUpDownIcon,
  FlameIcon,
  HomeIcon,
  PencilIcon,
  RotateCcwIcon,
  RotateCwIcon,
  Share2Icon,
  TrophyIcon,
  Undo2Icon,
} from '../components/icons';
import { type SavedMatch } from '../../storage';
import { useMatchStore } from '../../store/useMatchStore';

// Détecte à la compilation les .riv présents sous src/assets/rive/. Évite
// ainsi tout fetch (et donc tout 404) quand le fichier n'a pas été déposé.
const riveAssets = import.meta.glob<{ default: string }>(
  '../../assets/rive/*.riv',
  { eager: true, query: '?url' }
);
const RIVE_BY_NAME: Record<string, string> = {};
for (const [path, mod] of Object.entries(riveAssets)) {
  const name = path.split('/').pop();
  if (name) RIVE_BY_NAME[name] = mod.default;
}

const RIVE_SRC: string | null = RIVE_BY_NAME['shuttle.riv'] ?? null;
const SCORE_INSET_PCT = 20.5;
const SET_OFFSET_PCT = 9;

interface SetWins {
  team1: number;
  team2: number;
}

function formatScore(value: number): string {
  return value.toString().padStart(2, '0');
}

function resolveTeamLabel(team: Team, fallbacks: [string, string?]): string {
  const primary = team.primary || fallbacks[0];
  if (team.partner !== undefined) {
    const partner = team.partner || fallbacks[1] || '';
    return partner ? `${primary} & ${partner}` : primary;
  }
  return primary;
}

/**
 * Nombre maximum de sets pouvant être joués dans un match donné.
 * `setsToWin` est le nombre de sets gagnants requis ; au pire l'adversaire
 * en gagne `setsToWin - 1` avant le dernier set décisif.
 */
function maxTotalSets(setsToWin: number): number {
  return 2 * setsToWin - 1;
}

function isSetWon(
  scoreA: number,
  scoreB: number,
  target: number,
  cap: PointsCap
): boolean {
  if (cap !== null && scoreA >= cap && scoreA > scoreB) return true;
  return scoreA >= target && scoreA - scoreB >= 2;
}

function isSetPoint(
  scoreA: number,
  scoreB: number,
  target: number,
  cap: PointsCap
): boolean {
  return isSetWon(scoreA + 1, scoreB, target, cap);
}

export function MatchView() {
  const { t, locale } = useI18n();
  const feedback = useFeedback();
  const colors = useTeamColors();
  const navigate = useNavigate();

  const {
    match,
    score1,
    score2,
    setWins,
    matchWinner,
    server,
    setScores,
    pendingSideChange,
    pendingFeedback,
    lastSetSummary,
    startedAt,
    endedAt,
    streak1,
    streak2,
    maxStreak1,
    maxStreak2,
    pausedAt,
    totalPausedMs,
    history,
    pendingTieBreak,
    currentSetStartedAt,
    score: handleScore,
    subtract: handleSubtract,
    undo: handleUndo,
    swap: handleSwap,
    reset,
    restart: handleRematch,
    setMatch,
    dismissSideChange,
    clearFeedback,
    clearSetSummary,
    pauseChrono,
    resumeChrono,
    resetChrono,
    saveToHistory,
    closeCurrentSet,
  } = useMatchStore();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [team1Inverted, setTeam1Inverted] = useState(false);
  const [team2Inverted, setTeam2Inverted] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetChronoConfirmOpen, setResetChronoConfirmOpen] = useState(false);
  const [toast, setToast] = useState<{
    key: number;
    message: string;
    color: string;
  } | null>(null);
  const savedMatchIdRef = useRef<string | null>(null);
  const toastKeyRef = useRef(0);

  // Rediriger vers l'accueil si aucun match n'est configuré
  useEffect(() => {
    if (!match && !wizardOpen) {
      navigate('/');
    }
  }, [match, wizardOpen, navigate]);

  // Fire feedback effects (sound + haptic) after the store marks an event.
  useEffect(() => {
    if (pendingFeedback) {
      feedback.trigger(pendingFeedback);
      clearFeedback();
    }
  }, [pendingFeedback, feedback, clearFeedback]);

  // Fallbacks suivent l'id stable de l'équipe : après une permutation, on
  // voit visuellement le changement même si aucun nom n'a été saisi.
  const team1Fallbacks: [string, string] =
    match?.team1.id === 'B'
      ? [t('players.player2'), t('players.partner2')]
      : [t('players.player1'), t('players.partner1')];
  const team2Fallbacks: [string, string] =
    match?.team2.id === 'A'
      ? [t('players.player1'), t('players.partner1')]
      : [t('players.player2'), t('players.partner2')];
  const player1Label = match
    ? resolveTeamLabel(match.team1, team1Fallbacks)
    : t('players.player1');
  const player2Label = match
    ? resolveTeamLabel(match.team2, team2Fallbacks)
    : t('players.player2');

  const isDoubles = match?.type === 'doubles';

  function teamPair(
    team: Team | undefined,
    inverted: boolean,
    fallbacks: [string, string]
  ): { top: string; bottom: string } {
    if (!team || !team.partner) {
      // Doubles avec partner manquant : on ne montre PAS de fallback —
      // seule la pastille du bas reste visible (avec son icône ↕), sans
      // texte tant que rien n'est saisi.
      return { top: '', bottom: team?.primary ?? '' };
    }
    const primary = team.primary || fallbacks[0];
    const partner = team.partner || fallbacks[1];
    return inverted
      ? { top: primary, bottom: partner }
      : { top: partner, bottom: primary };
  }

  const team1Pair = teamPair(match?.team1, team1Inverted, team1Fallbacks);
  const team2Pair = teamPair(match?.team2, team2Inverted, team2Fallbacks);

  const showToast = useCallback((message: string, color: string) => {
    toastKeyRef.current += 1;
    setToast({ key: toastKeyRef.current, message, color });
  }, []);

  const handleToggleChrono = useCallback(() => {
    if (pausedAt !== null) {
      resumeChrono();
    } else {
      pauseChrono();
    }
  }, [pausedAt, resumeChrono, pauseChrono]);

  const confirmReset = useCallback(() => {
    reset();
    savedMatchIdRef.current = null;
    setResetConfirmOpen(false);
  }, [reset]);

  const confirmResetChrono = useCallback(() => {
    resetChrono();
    setResetChronoConfirmOpen(false);
  }, [resetChrono]);

  /**
   * "Retour à l'accueil" depuis le MatchOverOverlay : on efface le match en
   * cours et on réinitialise le scoreboard. L'overlay se ferme automatiquement
   * (matchWinner devient null après reset).
   */
  const handleBackHome = useCallback(() => {
    reset();
    setTeam1Inverted(false);
    setTeam2Inverted(false);
    savedMatchIdRef.current = null;
    navigate('/');
  }, [reset, navigate]);

  useKeyboardShortcuts(
    useMemo(
      () => ({
        onTeam1: () => handleScore('team1'),
        onTeam2: () => handleScore('team2'),
        onUndo: handleUndo,
        onReset: () => setResetConfirmOpen(true),
        onSwap: handleSwap,
      }),
      [handleScore, handleUndo, handleSwap]
    )
  );

  const serverScore = server === 'team1' ? score1 : score2;
  const winnerLabel =
    matchWinner === 'team1'
      ? player1Label
      : matchWinner === 'team2'
        ? player2Label
        : '';

  const setNumber = setScores.length + 1;
  const totalSets = match ? maxTotalSets(match.sets) : 0;
  const pointsTarget = match?.points;

  const team1AtSetPoint =
    !!match &&
    !matchWinner &&
    isSetPoint(score1, score2, match.points, match.cap);
  const team2AtSetPoint =
    !!match &&
    !matchWinner &&
    isSetPoint(score2, score1, match.points, match.cap);
  const setsToWin = match?.sets ?? 0;
  const team1AtMatchPoint = team1AtSetPoint && setWins.team1 + 1 >= setsToWin;
  const team2AtMatchPoint = team2AtSetPoint && setWins.team2 + 1 >= setsToWin;

  // Save completed match to history (once per finished match).
  useEffect(() => {
    if (!matchWinner || !match) {
      savedMatchIdRef.current = null;
      return;
    }
    if (savedMatchIdRef.current) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    savedMatchIdRef.current = id;
    const durationMs =
      startedAt && endedAt ? Math.max(0, endedAt - startedAt) : undefined;
    const saved: SavedMatch = {
      id,
      completedAt: Date.now(),
      config: match,
      setScores,
      finalSetWins: setWins,
      winner: matchWinner,
      durationMs,
      maxStreak: { team1: maxStreak1, team2: maxStreak2 },
    };
    saveToHistory(saved);
  }, [
    matchWinner,
    match,
    setScores,
    setWins,
    startedAt,
    endedAt,
    maxStreak1,
    maxStreak2,
    saveToHistory,
  ]);

  /**
   * SECONDE copie du partage, recopiée à la main ici alors que `src/share.ts`
   * en portait déjà une. Les deux avaient le même trou : `navigator.share`
   * présent mais qui échoue sautait le repli presse-papiers, et l'écran ne
   * disait rien. `shareOrCopy` du socle ne saute le repli que sur
   * `AbortError` — la feuille fermée par l'utilisateur — et renvoie ce qui
   * s'est réellement passé.
   */
  const handleShare = async () => {
    if (!match || !matchWinner) return;
    const setsText = setScores.map(s => `${s.team1}-${s.team2}`).join(', ');
    const body = t('scoreboard.shareBody', {
      a: player1Label,
      sa: setWins.team1,
      sb: setWins.team2,
      b: player2Label,
      sets: setsText,
    });
    await shareOrCopy({ title: t('scoreboard.shareTitle'), text: body });
  };

  const handleSwapEnhanced = useCallback(() => {
    handleSwap();
    setTeam1Inverted(team2Inverted);
    setTeam2Inverted(team1Inverted);
  }, [handleSwap, team1Inverted, team2Inverted]);

  const handleComplete = (config: MatchConfig) => {
    setMatch(config);
    setTeam1Inverted(false);
    setTeam2Inverted(false);
    savedMatchIdRef.current = null;
    setWizardOpen(false);
  };

  if (!match && !wizardOpen) return null;

  return (
    <>
      <FullscreenPrompt />
      <PwaInstallPrompt />
      <OnboardingHint />
      <div className="mb-scoreboard-wrap relative w-full">
        <section
          aria-label={t('home.scoreboardLabel')}
          className="mb-scoreboard relative w-full overflow-hidden shadow-2xl"
          style={{ boxShadow: 'var(--shadow)' }}
        >
          <div className="absolute inset-0 grid grid-cols-2">
            <ScorePanel
              background={colors.team1}
              textColor="#ffffff"
              onScore={() => {
                handleScore('team1');
                showToast(
                  t('toast.pointAdded', { name: player1Label }),
                  colors.team1
                );
              }}
              onSubtract={() => {
                if (score1 > 0) {
                  handleSubtract('team1');
                  showToast(
                    t('toast.pointRemoved', { name: player1Label }),
                    colors.team1
                  );
                }
              }}
              ariaLabel={t('scoreboard.addPoint', { name: player1Label })}
              subtractLabel={t('scoreSubtract', { name: player1Label })}
            />
            <ScorePanel
              background={colors.team2}
              textColor="#ffffff"
              onScore={() => {
                handleScore('team2');
                showToast(
                  t('toast.pointAdded', { name: player2Label }),
                  colors.team2
                );
              }}
              onSubtract={() => {
                if (score2 > 0) {
                  handleSubtract('team2');
                  showToast(
                    t('toast.pointRemoved', { name: player2Label }),
                    colors.team2
                  );
                }
              }}
              ariaLabel={t('scoreboard.addPoint', { name: player2Label })}
              subtractLabel={t('scoreSubtract', { name: player2Label })}
            />
          </div>

          <CourtOverlay
            server={server}
            serverScore={serverScore}
            team1Color={colors.team1}
            team2Color={colors.team2}
          />

          {/*
            Annonce vocale du score pour les lecteurs d'écran. On inclut les
            noms d'équipe (ou fallback) et un bandeau "match point" / "set
            point" quand pertinent. Si le match est terminé, on annonce
            l'équipe gagnante.
           */}
          <span className="sr-only" role="status" aria-live="polite">
            {matchWinner
              ? t('liveMatchOver', { winner: winnerLabel })
              : t('liveScore', { a: score1, b: score2 }) +
                (team1AtMatchPoint || team2AtMatchPoint
                  ? ' — ' + t('scoreboard.matchPoint')
                  : team1AtSetPoint || team2AtSetPoint
                    ? ' — ' + t('scoreboard.setPoint')
                    : '')}
          </span>

          {toast && (
            <ScoreToast
              key={toast.key}
              triggerKey={toast.key}
              message={toast.message}
              background={toast.color}
            />
          )}

          {match && pointsTarget && (
            <SetHeader
              label={t('scoreboard.setHeader', {
                n: setNumber,
                total: totalSets,
                points: pointsTarget,
              })}
            />
          )}

          <ScoreDisplay
            side="left"
            score={score1}
            background={colors.team1}
            locale={locale}
            atSetPoint={team1AtSetPoint}
            atMatchPoint={team1AtMatchPoint}
            setPointLabel={t('scoreboard.setPoint')}
            matchPointLabel={t('scoreboard.matchPoint')}
          />
          <ScoreDisplay
            side="right"
            score={score2}
            background={colors.team2}
            locale={locale}
            atSetPoint={team2AtSetPoint}
            atMatchPoint={team2AtMatchPoint}
            setPointLabel={t('scoreboard.setPoint')}
            matchPointLabel={t('scoreboard.matchPoint')}
          />

          {streak1 >= 2 && (
            <StreakBadge
              side="left"
              label={t('scoreboard.streak', { n: streak1 })}
            />
          )}
          {streak2 >= 2 && (
            <StreakBadge
              side="right"
              label={t('scoreboard.streak', { n: streak2 })}
            />
          )}

          <SetScoreDisplay
            side="left"
            count={setWins.team1}
            background={colors.team1}
          />
          <SetScoreDisplay
            side="right"
            count={setWins.team2}
            background={colors.team2}
          />

          {isDoubles ? (
            <>
              {team1Pair.top && (
                <LabelDisplay
                  side="left"
                  position="top"
                  label={team1Pair.top}
                  background={colors.team1}
                  onSwap={() => setTeam1Inverted(s => !s)}
                  swapLabel={t('scoreboard.invertPlayers')}
                />
              )}
              <LabelDisplay
                side="left"
                position="bottom"
                label={team1Pair.bottom}
                background={colors.team1}
                onSwap={() => setTeam1Inverted(s => !s)}
                swapLabel={t('scoreboard.invertPlayers')}
              />
              {team2Pair.top && (
                <LabelDisplay
                  side="right"
                  position="top"
                  label={team2Pair.top}
                  background={colors.team2}
                  onSwap={() => setTeam2Inverted(s => !s)}
                  swapLabel={t('scoreboard.invertPlayers')}
                />
              )}
              <LabelDisplay
                side="right"
                position="bottom"
                label={team2Pair.bottom}
                background={colors.team2}
                onSwap={() => setTeam2Inverted(s => !s)}
                swapLabel={t('scoreboard.invertPlayers')}
              />
            </>
          ) : (
            <>
              <LabelDisplay
                side="left"
                position="bottom"
                label={player1Label}
                background={colors.team1}
              />
              <LabelDisplay
                side="right"
                position="bottom"
                label={player2Label}
                background={colors.team2}
              />
            </>
          )}

          <div
            className="pointer-events-none absolute left-1/2 z-10"
            style={{
              top: '18%',
              transform: 'translate(-50%, -50%)',
              width: 'min(14%, 92px)',
              aspectRatio: '1 / 1',
            }}
          >
            {RIVE_SRC ? (
              <RiveScene
                src={RIVE_SRC}
                ariaLabel={t('home.scoreboardLabel')}
                className="h-full w-full"
                fallback={<ShuttleFallback />}
              />
            ) : (
              <ShuttleFallback />
            )}
          </div>

          <button
            type="button"
            onClick={handleSwapEnhanced}
            aria-label={t('scoreboard.swap')}
            className="absolute left-1/2 top-1/2 z-20 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-lg ring-2 ring-black/10 transition-transform hover:scale-105 active:scale-95 sm:h-14 sm:w-14"
            style={{ background: '#ffffff', color: '#1f2937' }}
          >
            <ArrowLeftRightIcon size={24} strokeWidth={2.4} />
          </button>

          {pendingSideChange && !matchWinner && (
            <SideChangeBanner
              onSwap={() => {
                handleSwapEnhanced();
              }}
              onDismiss={dismissSideChange}
            />
          )}

          {pendingTieBreak && !matchWinner && (
            <div
              role="alert"
              aria-live="assertive"
              className="pointer-events-none absolute left-1/2 top-[18%] z-[9] -translate-x-1/2 select-none whitespace-nowrap rounded-full bg-red-600/95 px-4 py-1.5 text-sm font-bold text-white shadow-lg"
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
            >
              ⚡ {t('scoreboard.tieBreakBanner')}
            </div>
          )}

          {lastSetSummary && !matchWinner && (
            <SetTransitionBanner
              winnerName={
                lastSetSummary.winner === 'team1' ? player1Label : player2Label
              }
              scoreA={lastSetSummary.a}
              scoreB={lastSetSummary.b}
              onClose={clearSetSummary}
            />
          )}

          {matchWinner && (
            <MatchOverOverlay
              winnerLabel={winnerLabel}
              setWins={setWins}
              setScores={setScores}
              onNewMatch={() => setWizardOpen(true)}
              onRematch={handleRematch}
              onBackHome={handleBackHome}
              onShare={handleShare}
              canShare={
                typeof navigator !== 'undefined' &&
                (typeof navigator.share === 'function' ||
                  typeof navigator.clipboard?.writeText === 'function')
              }
            />
          )}
        </section>

        <footer className="mb-scoreboard-footer flex items-center justify-between gap-2 bg-black/55 px-4 text-white backdrop-blur-sm">
          <span className="flex min-w-0 items-center gap-2 truncate text-sm font-medium">
            <Logo size={18} />
            <span className="hidden truncate sm:inline">
              {t('scoreboard.title')}
            </span>
            <MatchDuration
              startedAt={startedAt}
              endedAt={endedAt}
              pausedAt={pausedAt}
              totalPausedMs={totalPausedMs}
              onToggle={handleToggleChrono}
              onReset={() => setResetChronoConfirmOpen(true)}
              pauseLabel={t('scoreboard.pauseChrono')}
              resumeLabel={t('scoreboard.resumeChrono')}
              resetLabel={t('scoreboard.resetChrono')}
            />
            {match?.timeLimitMin != null && !matchWinner && (
              <SetCountdown
                setStartedAt={currentSetStartedAt}
                timeLimitMin={match.timeLimitMin}
                pausedAccumulatedMs={totalPausedMs}
                paused={pausedAt !== null}
                onElapsed={() => {
                  // Évite les rappels répétés une fois fini : closeCurrentSet
                  // est idempotent quand le set est déjà fermé (currentSetStartedAt
                  // repasse à null, désactivant le badge).
                  closeCurrentSet();
                }}
              />
            )}
          </span>
          <div className="flex items-center gap-1 text-base">
            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              aria-label={t('scoreboard.edit')}
              className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-white/10"
            >
              <PencilIcon size={18} />
            </button>
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length === 0}
              aria-label={t('scoreboard.undo')}
              className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Undo2Icon size={18} />
            </button>
            <button
              type="button"
              onClick={() => setResetConfirmOpen(true)}
              aria-label={t('scoreboard.reset')}
              className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-white/10"
            >
              <RotateCcwIcon size={18} />
            </button>
          </div>
        </footer>
      </div>

      {wizardOpen && (
        <MatchSetupWizard
          initial={match}
          onCancel={() => setWizardOpen(false)}
          onComplete={handleComplete}
        />
      )}
      {/* ConfirmDialog du socle : `z-[80]` comme l'ancienne copie locale
          (au-dessus des bandeaux fixes z-55/60/65) ; libellés explicites,
          le dictionnaire du socle ne couvrant pas l'espagnol. */}
      <ConfirmDialog
        open={resetConfirmOpen}
        className="z-[80]"
        title={t('confirm.title')}
        message={t('scoreboard.reset')}
        confirmLabel={t('confirm.confirm')}
        cancelLabel={t('confirm.cancel')}
        destructive
        onConfirm={confirmReset}
        onCancel={() => setResetConfirmOpen(false)}
      />
      <ConfirmDialog
        open={resetChronoConfirmOpen}
        className="z-[80]"
        title={t('confirm.title')}
        message={t('scoreboard.confirmResetChrono')}
        confirmLabel={t('confirm.confirm')}
        cancelLabel={t('confirm.cancel')}
        destructive
        onConfirm={confirmResetChrono}
        onCancel={() => setResetChronoConfirmOpen(false)}
      />
    </>
  );
}

interface ScorePanelProps {
  background: string;
  textColor: string;
  ariaLabel: string;
  subtractLabel: string;
  onScore: () => void;
  onSubtract: () => void;
}

function ScorePanel({
  background,
  textColor,
  ariaLabel,
  subtractLabel,
  onScore,
  onSubtract,
}: ScorePanelProps) {
  const { isPressing, handlers } = useTapOrLongPress(onScore, onSubtract);
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={`${ariaLabel} — ${subtractLabel}`}
      {...handlers}
      className="relative h-full w-full select-none text-left transition-[filter] duration-150 active:brightness-90"
      style={{
        background,
        color: textColor,
        touchAction: 'manipulation',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        filter: isPressing ? 'brightness(0.78)' : undefined,
      }}
    />
  );
}

interface ScoreDisplayProps {
  side: 'left' | 'right';
  score: number;
  background: string;
  locale: string;
  atSetPoint: boolean;
  atMatchPoint: boolean;
  setPointLabel: string;
  matchPointLabel: string;
}

function ScoreDisplay({
  side,
  score,
  background,
  locale,
  atSetPoint,
  atMatchPoint,
  setPointLabel,
  matchPointLabel,
}: ScoreDisplayProps) {
  const aura = [
    `0 0 6px ${background}`,
    `0 0 14px ${background}`,
    `0 0 28px ${background}`,
    `0 0 56px ${background}`,
    '0 6px 22px rgba(0,0,0,0.32)',
  ].join(', ');

  const baseTransform = `translate(${side === 'left' ? '-50%' : '50%'}, -50%)`;
  const label = atMatchPoint
    ? matchPointLabel
    : atSetPoint
      ? setPointLabel
      : '';

  return (
    <span
      aria-hidden
      key={`${score}-${locale}`}
      className={`pointer-events-none absolute z-[5] select-none font-medium leading-none text-white ${
        atMatchPoint ? 'mb-match-point-aura' : ''
      }`}
      style={{
        top: '50%',
        [side === 'left' ? 'left' : 'right']: `${SCORE_INSET_PCT}%`,
        transform: baseTransform,
        fontVariantNumeric: 'tabular-nums',
        fontSize: 'clamp(4.5rem, 20vw, 18rem)',
        letterSpacing: '-0.04em',
        textShadow: aura,
        borderRadius: '12%',
        padding: '0.05em',
        ['--mb-score-transform' as string]: baseTransform,
        animation: 'mb-score-pop 220ms ease-out',
      }}
    >
      {formatScore(score)}
      {label && (
        <span
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center text-[0.18em] font-bold uppercase tracking-widest"
          style={{
            top: '0.08em',
            color: '#fff200',
            textShadow: `0 0 4px ${background}, 0 0 10px rgba(0,0,0,0.4)`,
          }}
        >
          {label}
        </span>
      )}
    </span>
  );
}

interface SetScoreDisplayProps {
  side: 'left' | 'right';
  count: number;
  background: string;
}

function SetScoreDisplay({ side, count, background }: SetScoreDisplayProps) {
  const aura = [
    `0 0 4px ${background}`,
    `0 0 10px ${background}`,
    `0 0 20px ${background}`,
    '0 2px 8px rgba(0,0,0,0.3)',
  ].join(', ');

  const leftPct = side === 'left' ? 50 - SET_OFFSET_PCT : 50 + SET_OFFSET_PCT;

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute z-[5] select-none font-medium leading-none text-white"
      style={{
        top: '18%',
        left: `${leftPct}%`,
        transform: 'translate(-50%, -50%)',
        fontVariantNumeric: 'tabular-nums',
        fontSize: 'clamp(3.25rem, 11vw, 8rem)',
        textShadow: aura,
      }}
    >
      {count}
    </span>
  );
}

interface LabelDisplayProps {
  side: 'left' | 'right';
  position: 'top' | 'bottom';
  label: string;
  background: string;
  onSwap?: () => void;
  swapLabel?: string;
}

function LabelDisplay({
  side,
  position,
  label,
  background,
  onSwap,
  swapLabel,
}: LabelDisplayProps) {
  const aura = [
    `0 0 4px ${background}`,
    `0 0 12px ${background}`,
    `0 0 24px ${background}`,
    '0 2px 8px rgba(0,0,0,0.3)',
  ].join(', ');

  // Bottom plus haut que top : laisse passer la safe-area iOS + le footer.
  const positioning = {
    [position === 'top' ? 'top' : 'bottom']: position === 'top' ? '11%' : '16%',
    [side === 'left' ? 'left' : 'right']: `${SCORE_INSET_PCT}%`,
    transform: `translateX(${side === 'left' ? '-50%' : '50%'})`,
  };

  const styling = {
    ...positioning,
    fontSize: 'clamp(1.125rem, 3.6vw, 2.25rem)',
    textShadow: aura,
  } as const;

  if (onSwap) {
    return (
      <button
        type="button"
        onClick={onSwap}
        aria-label={swapLabel}
        className="absolute z-[6] flex max-w-[42%] cursor-pointer select-none items-center gap-1 truncate font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        style={styling}
      >
        {label && <span className="truncate">{label}</span>}
        <span aria-hidden className="opacity-80">
          <ArrowUpDownIcon size={16} />
        </span>
      </button>
    );
  }

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute z-[5] max-w-[42%] select-none truncate font-semibold text-white"
      style={styling}
    >
      {label}
    </span>
  );
}

interface SetHeaderProps {
  label: string;
}

function SetHeader({ label }: SetHeaderProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-1 z-[5] flex justify-center">
      <span
        className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white sm:text-xs"
        style={{ background: 'rgba(0,0,0,0.55)' }}
      >
        {label}
      </span>
    </div>
  );
}

interface MatchOverOverlayProps {
  winnerLabel: string;
  setWins: SetWins;
  setScores: { team1: number; team2: number }[];
  onNewMatch: () => void;
  onRematch: () => void;
  onBackHome: () => void;
  onShare: () => void;
  canShare: boolean;
}

function MatchOverOverlay({
  winnerLabel,
  setWins,
  setScores,
  onNewMatch,
  onRematch,
  onBackHome,
  onShare,
  canShare,
}: MatchOverOverlayProps) {
  const { t } = useI18n();
  const setsLine = setScores.map(s => `${s.team1}-${s.team2}`).join(', ');
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('matchOver.label')}
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/65 backdrop-blur-sm"
      style={{
        paddingInline: 'clamp(1rem, 4vw, 1.5rem)',
        paddingBlock: 'clamp(1rem, 4vw, 1.5rem)',
      }}
    >
      <div
        className="flex max-h-full max-w-md flex-col items-center gap-3 overflow-y-auto rounded-2xl border text-center shadow-2xl"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          color: 'var(--text)',
          padding: 'clamp(1rem, 3.2vw, 1.75rem)',
          animation: 'mb-match-celebration 480ms ease-out',
        }}
      >
        <p
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: 'var(--muted)' }}
        >
          {t('matchOver.label')}
        </p>
        <h2
          className="inline-flex items-center justify-center gap-2 break-words font-bold"
          style={{
            color: 'var(--primary)',
            fontSize: 'clamp(1.25rem, 4.5vw, 1.75rem)',
          }}
        >
          <TrophyIcon size={28} aria-hidden />
          <span>{t('matchOver.winnerText', { name: winnerLabel })}</span>
        </h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          {t('matchOver.score', { a: setWins.team1, b: setWins.team2 })}
        </p>
        {setsLine && (
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            {t('matchOver.setsList', { sets: setsLine })}
          </p>
        )}
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={onRematch}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white"
            style={{ background: 'var(--primary)' }}
          >
            <RotateCwIcon size={16} />
            {t('matchOverExtra.rematch')}
          </button>
          <button
            type="button"
            onClick={onNewMatch}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold"
            style={{
              background: 'var(--surface-highlight)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
          >
            <PencilIcon size={16} />
            {t('matchOver.newMatch')}
          </button>
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold"
            style={{
              background: 'var(--surface-highlight)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
          >
            <HomeIcon size={16} />
            {t('matchOverExtra.backHome')}
          </button>
          {canShare && (
            <button
              type="button"
              onClick={onShare}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold"
              style={{
                background: 'var(--surface-highlight)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
            >
              <Share2Icon size={16} />
              {t('matchOver.share')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// MatchDuration extrait vers `../components/MatchDuration.tsx`. On
// continue à `formatDuration` ailleurs dans ce fichier (résumé final, etc.)
// via l'import nommé ci-dessus.

interface StreakBadgeProps {
  side: 'left' | 'right';
  label: string;
}

function StreakBadge({ side, label }: StreakBadgeProps) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute z-[6] flex select-none items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-md sm:text-sm"
      style={{
        // Placé au-dessus des deux positions possibles du rond de service
        // (cy=55 ≈ 27% et cy=145 ≈ 64-72% selon le letterbox du court SVG),
        // juste sous le compteur de sets (top:18%).
        top: '25%',
        [side === 'left' ? 'left' : 'right']: `${SCORE_INSET_PCT}%`,
        transform: `translateX(${side === 'left' ? '-50%' : '50%'})`,
        background: 'rgba(0,0,0,0.55)',
      }}
    >
      <FlameIcon size={14} />
      {label}
    </span>
  );
}

function ShuttleFallback() {
  return (
    <div
      className="flex h-full w-full items-center justify-center text-4xl sm:text-5xl"
      style={{ animation: 'mb-shuttle-float 2.4s ease-in-out infinite' }}
      aria-hidden
    >
      🏸
    </div>
  );
}
