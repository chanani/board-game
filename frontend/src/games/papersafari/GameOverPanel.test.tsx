import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PaperSafariView } from '../../api/types';
import { GameOverPanel } from './GameOverPanel';

const names: Record<number, string> = { 1: '앨리스', 2: '밥' };
const slots = [0, 1, 2].flatMap((column) => [0, 1].map((row) => ({ column, row, faceUp: true, known: false, card: { kind: 'NUMBER' as const, value: 3 } })));

const game: PaperSafariView = {
  viewerId: 1, status: 'GAME_OVER', roundNumber: 3, tokens: { '1': 3, '2': 1 }, winnerId: 1,
  lastRoundResult: { players: [{ playerId: 1, score: 12, outcome: 'WIN' }, { playerId: 2, score: 25, outcome: 'LOSE' }] },
  round: { phase: 'ROUND_OVER', currentPlayerId: 1, deckSize: 10, discardTop: null, held: null,
    boards: [{ playerId: 1, slots }, { playerId: 2, slots }] },
};

describe('GameOverPanel', () => {
  it('마지막 라운드의 점수와 결과를 보여준다', () => {
    render(<GameOverPanel game={game} meId={1} nicknameOf={(id) => names[id]} onClose={vi.fn()} />);

    const dialog = screen.getByRole('dialog', { name: '게임 종료' });
    expect(within(dialog).getByText('마지막 라운드 결과')).toBeInTheDocument();
    expect(within(dialog).getByText(/12점/)).toBeInTheDocument();
    expect(within(dialog).getByText(/25점/)).toBeInTheDocument();
    expect(within(dialog).getAllByTestId('slot')).toHaveLength(12);
    expect(within(dialog).getByTestId('result-boards')).toHaveClass('gap-11', 'p-[13px]');
  });

  it('자리에 없던 관전자도 승자와 순위를 보고 닫을 수 있다', async () => {
    const onClose = vi.fn();
    render(<GameOverPanel game={{ ...game, viewerId: 3 }} meId={3} nicknameOf={(id) => names[id]} onClose={onClose} />);

    const dialog = screen.getByRole('dialog', { name: '게임 종료' });
    expect(within(dialog).getByRole('heading', { name: '앨리스님 승리!' })).toBeInTheDocument();
    expect(within(dialog).queryByText('🏆')).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /준비/ })).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: '대기실로 돌아가기' }));
    expect(onClose).toHaveBeenCalled();
  });
});
