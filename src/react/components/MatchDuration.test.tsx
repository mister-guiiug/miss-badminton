import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MatchDuration } from './MatchDuration';

/**
 * CE QUE CES TESTS VERROUILLENT : on peut démarrer le chrono à la main.
 *
 * Il ne partait qu'au premier point, et ce composant rendait `null` tant que
 * `startedAt` était vide — il n'existait donc AUCUN endroit dans l'application
 * pour lancer la pendule. Or un match commence avant son premier point :
 * échauffement, filet à régler, service manqué.
 *
 * Ce qui est éprouvé est le contrat de l'écran, pas la mise en forme : ce qu'on
 * voit avant le départ, ce qu'on peut faire, et ce qui n'a pas de sens.
 */
function poser(
  props: Partial<React.ComponentProps<typeof MatchDuration>> = {}
) {
  const onStart = vi.fn();
  const onToggle = vi.fn();
  const onReset = vi.fn();
  render(
    <MatchDuration
      startedAt={null}
      endedAt={null}
      pausedAt={null}
      totalPausedMs={0}
      onStart={onStart}
      onToggle={onToggle}
      onReset={onReset}
      startLabel="Démarrer le chrono"
      pauseLabel="Mettre le chrono en pause"
      resumeLabel="Reprendre le chrono"
      resetLabel="Remettre le chrono à zéro"
      {...props}
    />
  );
  return { onStart, onToggle, onReset };
}

afterEach(() => {
  cleanup();
});

describe('le chrono avant son départ', () => {
  it('se montre à 0:00 avec un bouton pour le lancer', () => {
    // Avant, ce composant ne rendait RIEN : le bouton ne pouvait pas exister.
    const { onStart } = poser();

    expect(screen.getByText('0:00')).toBeInTheDocument();
    const bouton = screen.getByRole('button', { name: 'Démarrer le chrono' });

    fireEvent.click(bouton);

    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("n'offre pas de remise à zéro : il n'y a rien à remettre", () => {
    poser();

    expect(
      screen.queryByRole('button', { name: 'Remettre le chrono à zéro' })
    ).toBeNull();
    // Et surtout pas de « pause » sur une pendule arrêtée.
    expect(
      screen.queryByRole('button', { name: 'Mettre le chrono en pause' })
    ).toBeNull();
  });

  it('une fois lancé, rend la pause et la remise à zéro', () => {
    const { onToggle, onReset } = poser({ startedAt: Date.now() });

    expect(
      screen.queryByRole('button', { name: 'Démarrer le chrono' })
    ).toBeNull();

    fireEvent.click(
      screen.getByRole('button', { name: 'Mettre le chrono en pause' })
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Remettre le chrono à zéro' })
    );

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('un match fini ne propose plus rien à piloter', () => {
    const debut = Date.now() - 65_000;
    poser({ startedAt: debut, endedAt: debut + 65_000 });

    // La durée reste lisible — c'est une information —, mais elle ne se
    // manipule plus.
    expect(screen.getByText('1:05')).toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});
