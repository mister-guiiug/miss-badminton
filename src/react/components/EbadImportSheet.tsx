import { useEffect, useId, useState } from 'react';
import { Sheet } from '@mister-guiiug/dev-pwa-config/react/sheet';
import { useI18n } from '../../i18n';
import {
  EbadConnectorError,
  importedRemoteIds,
  loadConfiguredConnector,
  remoteIdOf,
  toEbadInput,
  type EbadConnector,
  type RemoteTournament,
  type TournamentMatches,
} from '../../ebad-connector';
import { ebadTeamLabel, localDateKey } from '../../ebad';
import {
  beginLogin,
  configuredOAuth,
  currentAccessToken,
  logout,
} from '../../ebad-oauth';
import { useEbadStore } from '../../store/useEbadStore';

interface EbadImportSheetProps {
  onClose: () => void;
  /** Le décompte de l'import, pour que la page l'annonce. */
  onImported: (result: { added: number; updated: number }) => void;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; error: EbadConnectorError };

const inputStyle = {
  background: 'var(--surface-highlight)',
  borderColor: 'var(--border)',
  color: 'var(--text)',
} as const;

/**
 * L'IMPORT DEPUIS LA FFBaD, en deux temps : chercher un tournoi, puis cocher
 * les matchs à importer. Un match déjà importé est marqué et sera mis à jour
 * (horaire, terrain, résultat officiel) sans perdre sa liaison.
 *
 * La feuille ne parle qu'au connecteur (`ebad-connector.ts`), jamais à la
 * FFBaD : c'est le proxy qui détient les identifiants.
 */
export function EbadImportSheet({ onClose, onImported }: EbadImportSheetProps) {
  const { t } = useI18n();
  const ids = useId();
  const existing = useEbadStore(s => s.matches);
  const importMatches = useEbadStore(s => s.importMatches);

  const [connector, setConnector] = useState<EbadConnector | null>(null);
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState(() => localDateKey(Date.now()));
  const [tournaments, setTournaments] = useState<RemoteTournament[] | null>(
    null
  );
  const [detail, setDetail] = useState<TournamentMatches | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  useEffect(() => {
    let alive = true;
    void loadConfiguredConnector().then(c => {
      if (alive) setConnector(c);
    });
    return () => {
      alive = false;
    };
  }, []);

  /*
   * « SE CONNECTER AVEC MyFFBaD », si l'app a un client OAuth. L'utilisateur
   * part s'identifier sur le site de la FFBaD et revient sur `/tournois`
   * (cf. `ebad-oauth.ts`) : aucun mot de passe ne passe par ici.
   */
  const oauth = configuredOAuth();
  const [connected, setConnected] = useState(() => !!currentAccessToken());
  const login = async () => {
    if (!oauth) return;
    window.location.assign(await beginLogin(oauth));
  };

  const fail = (error: unknown) => {
    const e =
      error instanceof EbadConnectorError
        ? error
        : new EbadConnectorError('network');
    // Un jeton refusé ne sert plus : on l'oublie, le bouton revient.
    if (e.kind === 'unauthorized') {
      logout();
      setConnected(false);
    }
    setStatus({ kind: 'error', error: e });
  };

  const search = async () => {
    if (!connector) return;
    setStatus({ kind: 'loading' });
    try {
      const list = await connector.searchTournaments({
        q: query,
        from: from || undefined,
      });
      setTournaments(list);
      setStatus({ kind: 'idle' });
    } catch (error) {
      fail(error);
    }
  };

  const open = async (tournament: RemoteTournament) => {
    if (!connector) return;
    setStatus({ kind: 'loading' });
    try {
      const data = await connector.tournamentMatches(tournament.id);
      setDetail(data);
      setSelected(new Set(data.matches.map(m => m.id)));
      setStatus({ kind: 'idle' });
    } catch (error) {
      fail(error);
    }
  };

  const already = importedRemoteIds(existing);

  const submit = () => {
    if (!detail) return;
    const inputs = detail.matches
      .filter(m => selected.has(m.id))
      .map(m => toEbadInput(detail.tournament, m));
    const result = importMatches(inputs);
    if (result) {
      onImported(result);
      onClose();
    }
  };

  const errorText = (error: EbadConnectorError): string => {
    switch (error.kind) {
      case 'unavailable':
        return t('ebad.importErrorUnavailable');
      case 'unauthorized':
        return t('ebad.importErrorUnauthorized');
      case 'invalid':
        return t('ebad.importErrorInvalid');
      case 'http':
        return t('ebad.importErrorHttp', { status: error.status ?? 0 });
      default:
        return t('ebad.importErrorNetwork');
    }
  };

  const loading = status.kind === 'loading';

  return (
    <Sheet
      open
      title={t('ebad.importTitle')}
      closeLabel={t('ebad.cancel')}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={detail ? () => setDetail(null) : onClose}
            className="rounded-lg border px-3 py-1.5 text-sm font-semibold"
            style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
          >
            {detail ? t('ebad.importBack') : t('ebad.cancel')}
          </button>
          {detail && (
            <button
              type="button"
              onClick={submit}
              disabled={selected.size === 0}
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-[var(--primary-ink)] disabled:opacity-40"
              style={{ background: 'var(--primary)' }}
            >
              {t('ebad.importSubmit', { n: selected.size })}
            </button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {oauth && !detail && (
          <div
            className="flex flex-col gap-2 rounded-xl px-3 py-2.5 text-xs"
            style={{
              background: 'var(--surface-highlight)',
              color: 'var(--muted)',
            }}
          >
            {connected ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className="font-semibold"
                  style={{ color: 'var(--text)' }}
                >
                  ✓ {t('ebad.oauthConnected')}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setConnected(false);
                  }}
                  className="rounded-lg border px-2.5 py-1 font-semibold"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  {t('ebad.oauthLogout')}
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void login()}
                  className="self-start rounded-lg px-4 py-2 text-sm font-bold text-[var(--primary-ink)]"
                  style={{ background: 'var(--primary)' }}
                >
                  {t('ebad.oauthLogin')}
                </button>
                <span>{t('ebad.oauthLoginHint')}</span>
              </>
            )}
          </div>
        )}

        {!detail && (
          <form
            className="flex flex-col gap-2"
            onSubmit={e => {
              e.preventDefault();
              void search();
            }}
          >
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <div className="flex min-w-0 flex-col gap-1 text-xs font-semibold">
                <label htmlFor={`${ids}-q`} className="opacity-70">
                  {t('ebad.tournament')}
                </label>
                <input
                  id={`${ids}-q`}
                  type="search"
                  value={query}
                  placeholder={t('ebad.importSearchPlaceholder')}
                  onChange={e => setQuery(e.target.value)}
                  maxLength={80}
                  className="w-full rounded-lg border px-3 py-2 text-base"
                  style={inputStyle}
                />
              </div>
              <div className="flex flex-col gap-1 text-xs font-semibold">
                <label htmlFor={`${ids}-from`} className="opacity-70">
                  {t('ebad.importFrom')}
                </label>
                <input
                  id={`${ids}-from`}
                  type="date"
                  value={from}
                  onChange={e => setFrom(e.target.value)}
                  className="rounded-lg border px-3 py-2 text-base"
                  style={inputStyle}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={!connector || loading}
              className="self-start rounded-lg px-4 py-2 text-sm font-bold text-[var(--primary-ink)] disabled:opacity-40"
              style={{ background: 'var(--primary)' }}
            >
              {t('ebad.importSearch')}
            </button>
          </form>
        )}

        <div aria-live="polite" className="text-sm">
          {loading && (
            <p style={{ color: 'var(--muted)' }}>{t('ebad.importLoading')}</p>
          )}
          {status.kind === 'error' && (
            <p role="alert" className="font-semibold text-red-600">
              {errorText(status.error)}
            </p>
          )}
        </div>

        {!detail && tournaments && !loading && (
          <ul className="flex flex-col gap-2">
            {tournaments.length === 0 && (
              <li className="text-sm" style={{ color: 'var(--muted)' }}>
                {t('ebad.importNoTournament')}
              </li>
            )}
            {tournaments.map(tour => (
              <li key={tour.id}>
                <button
                  type="button"
                  onClick={() => void open(tour)}
                  className="flex w-full flex-col items-start gap-0.5 rounded-xl border px-3.5 py-3 text-left"
                  style={{
                    borderColor: 'var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                  }}
                >
                  <span className="text-sm font-semibold">{tour.name}</span>
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>
                    {[tour.city, tour.startDate, tour.endDate]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {detail && !loading && (
          <section
            className="flex flex-col gap-2"
            aria-label={detail.tournament.name}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold">{detail.tournament.name}</h3>
              {detail.matches.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setSelected(
                      selected.size === detail.matches.length
                        ? new Set()
                        : new Set(detail.matches.map(m => m.id))
                    )
                  }
                  className="rounded-lg border px-2.5 py-1 text-xs font-semibold"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  {selected.size === detail.matches.length
                    ? t('ebad.importSelectNone')
                    : t('ebad.importSelectAll')}
                </button>
              )}
            </div>
            {detail.matches.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                {t('ebad.importNoMatch')}
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {detail.matches.map(m => {
                  const id = `${ids}-m-${m.id}`;
                  const isImported = already.has(
                    remoteIdOf(detail.tournament.id, m.id)
                  );
                  return (
                    <li
                      key={m.id}
                      className="flex items-start gap-2 rounded-xl border px-3 py-2"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <input
                        id={id}
                        type="checkbox"
                        checked={selected.has(m.id)}
                        onChange={e => {
                          const next = new Set(selected);
                          if (e.target.checked) next.add(m.id);
                          else next.delete(m.id);
                          setSelected(next);
                        }}
                        className="mt-1 size-4"
                      />
                      <label htmlFor={id} className="flex min-w-0 flex-col">
                        <span className="text-sm font-semibold">
                          {ebadTeamLabel(m.team1)} vs {ebadTeamLabel(m.team2)}
                        </span>
                        <span
                          className="text-xs"
                          style={{ color: 'var(--muted)' }}
                        >
                          {[m.discipline, m.round, m.date, m.time]
                            .filter(Boolean)
                            .join(' · ')}
                          {isImported ? ` — ${t('ebad.importAlready')}` : ''}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </div>
    </Sheet>
  );
}
