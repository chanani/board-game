import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PaperSafariSessionView } from '../../api/types';
import { RoundResultModal } from './RoundResultModal';
import { SoundContext, type SoundApi } from '../../lib/sound';

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
    vi.useFakeTimers();
    render(<RoundResultModal view={view} meId={1} nicknameOf={nicknameOf} onReady={vi.fn()} />);
    for (let step = 0; step < 12; step += 1) {
      act(() => { vi.advanceTimersByTime(120); });
    }
    vi.useRealTimers();

    const dialog = screen.getByRole('dialog', { name: '2라운드 결과' });
    expect(dialog).toHaveTextContent('앨리스');
    expect(dialog).toHaveTextContent('승');
    expect(dialog).toHaveTextContent('밥');
  });

  it('판 격자는 펠트 테두리(13px)만큼 여백과 간격을 둔다', () => {
    render(<RoundResultModal view={view} meId={1} nicknameOf={nicknameOf} onReady={vi.fn()} />);

    expect(screen.getByTestId('result-boards')).toHaveClass('gap-11', 'p-[13px]');
  });

  it('준비 버튼을 누르면 onReady', async () => {
    const onReady = vi.fn();
    render(<RoundResultModal view={view} meId={1} nicknameOf={nicknameOf} onReady={onReady} />);

    await userEvent.click(screen.getByRole('button', { name: '다음 라운드 준비' }));

    expect(onReady).toHaveBeenCalledOnce();
  });

  describe('공개 연출', () => {
    afterEach(() => vi.useRealTimers());

    it('카드가 모두 공개된 뒤에야 점수를 보여준다', () => {
      vi.useFakeTimers();
      render(<RoundResultModal view={view} meId={1} nicknameOf={nicknameOf} onReady={vi.fn()} />);
      const dialog = screen.getByRole('dialog', { name: '2라운드 결과' });

      expect(dialog).not.toHaveTextContent('9점');
      expect(dialog).not.toHaveTextContent('열 점수 1');
      expect(dialog).not.toHaveTextContent('🎀');
      expect(dialog).not.toHaveTextContent('승');
      expect(dialog).not.toHaveTextContent('패');
      expect(screen.getByRole('button', { name: '다음 라운드 준비' })).toBeEnabled();

      for (let step = 0; step < 12; step += 1) {
        act(() => { vi.advanceTimersByTime(120); });
      }

      expect(dialog).toHaveTextContent('9점');
      expect(dialog).toHaveTextContent('🎀 앨리스');
      expect(dialog).toHaveTextContent('패');
      expect(dialog).toHaveTextContent('열 점수');
      expect(dialog).toHaveTextContent('+');
    });
  });

  describe('결과 효과음', () => {
    afterEach(() => vi.useRealTimers());

    const renderWith = (play: SoundApi['play']) => {
      const ui = (fn: SoundApi['play']) => (
        <SoundContext.Provider value={{ play: fn, muted: false, toggleMuted: () => undefined }}>
          <RoundResultModal view={view} meId={1} nicknameOf={nicknameOf} onReady={vi.fn()} />
        </SoundContext.Provider>
      );
      const utils = render(ui(play));
      return { ...utils, again: (fn: SoundApi['play']) => utils.rerender(ui(fn)) };
    };

    it('모든 카드가 공개된 뒤에 한 번만 울리고, play가 바뀌어도 다시 울리지 않는다', () => {
      vi.useFakeTimers();
      const play = vi.fn();
      const { again } = renderWith(play);

      for (let step = 0; step < 11; step += 1) {
        act(() => { vi.advanceTimersByTime(120); });
      }
      expect(play).not.toHaveBeenCalled();

      act(() => { vi.advanceTimersByTime(120); });
      expect(play).toHaveBeenCalledOnce();
      expect(play).toHaveBeenCalledWith('roundWin');

      const next = vi.fn();
      again(next);
      act(() => { vi.advanceTimersByTime(1000); });
      expect(next).not.toHaveBeenCalled();
      expect(play).toHaveBeenCalledOnce();
    });
  });
});
