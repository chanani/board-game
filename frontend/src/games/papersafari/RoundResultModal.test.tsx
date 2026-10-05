import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PaperSafariSessionView } from '../../api/types';
import { RoundResultModal } from './RoundResultModal';

const slots = [0, 1, 2].flatMap((column) => [0, 1].map((row) => ({ column, row, faceUp: true, known: false, card: { kind: 'NUMBER' as const, value: column + 1 } })));
const view: PaperSafariSessionView = {
  readyPlayerIds: [],
  game: {
    viewerId: 1, status: 'ROUND_OVER', roundNumber: 2, tokens: { '1': 1, '2': 0 }, winnerId: null,
    lastRoundResult: { players: [{ playerId: 1, score: 0, outcome: 'WIN' }, { playerId: 2, score: 9, outcome: 'LOSE' }] },
    round: { phase: 'ROUND_OVER', currentPlayerId: 1, deckSize: 10, discardTop: null, held: null,
      boards: [{ playerId: 1, slots }, { playerId: 2, slots }] },
  },
};
const nicknameOf = (id: number) => (id === 1 ? '앨리스' : '밥');

describe('RoundResultModal', () => {
  it('라운드 결과 대화상자에 점수와 승패를 보여준다', () => {
    render(<RoundResultModal view={view} meId={1} nicknameOf={nicknameOf} onReady={vi.fn()} />);

    const dialog = screen.getByRole('dialog', { name: '2라운드 결과' });
    expect(dialog).toHaveTextContent('앨리스');
    expect(dialog).toHaveTextContent('승');
    expect(dialog).toHaveTextContent('밥');
  });

  it('준비 버튼을 누르면 onReady', async () => {
    const onReady = vi.fn();
    render(<RoundResultModal view={view} meId={1} nicknameOf={nicknameOf} onReady={onReady} />);

    await userEvent.click(screen.getByRole('button', { name: '다음 라운드 준비' }));

    expect(onReady).toHaveBeenCalledOnce();
  });
});
