import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SILENT_SOUND, SoundContext } from '../../lib/sound';
import type { Room, UnoView } from '../../api/types';
import { UnoTable } from './UnoTable';
import { num, unoEvent, unoView } from './unoFixtures';

const toast = vi.hoisted(() => ({ show: vi.fn() }));
const reduced = vi.hoisted(() => ({ value: false }));
vi.mock('motion/react', async (importOriginal) => ({ ...(await importOriginal<typeof import('motion/react')>()), useReducedMotion: () => reduced.value }));
vi.mock('../../components/Toast', () => ({ useToast: () => toast }));

const room: Room = {
  code: 'UNO123', name: '우노 방', gameType: 'UNO', gameTypeName: '우노', status: 'WAITING', hostId: 1, maxPlayers: 5,
  locked: false, spectators: [], theme: 'WOOD',
  members: [
    { id: 1, nickname: '앨리스', host: true, connected: true, offlineSeconds: 0, ready: false },
    { id: 2, nickname: '밥', host: false, connected: true, offlineSeconds: 0, ready: false },
  ],
};
const playing = unoView({ participantIds: [1, 2], players: [{ playerId: 1, cardCount: 1, unoDeclared: true }, { playerId: 2, cardCount: 4, unoDeclared: false }] });
const over: UnoView = unoView({
  participantIds: [1, 2], status: 'GAME_OVER', stage: null, currentPlayerId: null, winnerId: 1, hand: [],
  players: [{ playerId: 1, cardCount: 0, unoDeclared: false }, { playerId: 2, cardCount: 4, unoDeclared: false }],
  result: { reason: 'EMPTY_HAND', winnerId: 1, points: 22, players: [{ playerId: 2, cards: [num('BLUE', 7, 88)], points: 22 }] },
  events: [unoEvent(9, 'PLAY', { actorId: 1, card: num('RED', 2, 3) }), unoEvent(10, 'GAME_END', { actorId: 1, count: 22, reason: 'EMPTY_HAND' })],
});

const play = vi.fn();

function table(game: UnoView, transition: { seq: number; from: UnoView | null; to: UnoView; animate: boolean } | null, meId = 1) {
  return (
    <SoundContext.Provider value={{ ...SILENT_SOUND, play }}>
      <UnoTable view={{ gameType: 'UNO', game }} room={room} meId={meId} log={[]} receivedAt={0} now={0} errorSeq={0}
        nicknameOf={(id) => (id === 1 ? '앨리스' : '밥')} send={vi.fn()} onCloseGameOver={vi.fn()} onReadyNext={vi.fn()} transition={transition} />
    </SoundContext.Provider>
  );
}

afterEach(() => {
  vi.useRealTimers();
  reduced.value = false;
});

describe('우노 게임 끝 연출', () => {
  it('끝나는 순간을 보면 배너 뒤에 결과 창을 연다', () => {
    vi.useFakeTimers();
    const { rerender } = render(table(playing, null));

    rerender(table(over, { seq: 2, from: playing, to: over, animate: true }));
    expect(screen.queryByRole('dialog', { name: '게임 결과' })).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(450); });
    expect(screen.getByTestId('game-end-banner')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1400); });

    expect(screen.getByRole('dialog', { name: '게임 결과' })).toBeInTheDocument();
  });

  it('이미 끝난 화면을 받으면 바로 결과 창을 연다', () => {
    render(table(over, { seq: 1, from: null, to: over, animate: false }));

    expect(screen.getByRole('dialog', { name: '게임 결과' })).toBeInTheDocument();
  });
});

describe('우노 게임 끝 연출 예외', () => {
  it('기권으로 끝나면 배너 없이 바로 결과 창', () => {
    const forfeit: UnoView = { ...over, result: { reason: 'FORFEIT', winnerId: 1, points: 0, players: [] } };
    const { rerender } = render(table(playing, null));

    rerender(table(forfeit, { seq: 2, from: playing, to: forfeit, animate: true }));

    expect(screen.getByRole('dialog', { name: '게임 결과' })).toBeInTheDocument();
    expect(screen.queryByTestId('game-end-banner')).not.toBeInTheDocument();
  });

  it('동작 줄이기면 바로 결과 창', () => {
    reduced.value = true;
    const { rerender } = render(table(playing, null));

    rerender(table(over, { seq: 2, from: playing, to: over, animate: true }));

    expect(screen.getByRole('dialog', { name: '게임 결과' })).toBeInTheDocument();
  });

  it('지난 전환(to가 지금 화면이 아님)으로는 연출하지 않는다', () => {
    const stale = { ...over, hand: [] };
    render(table(over, { seq: 2, from: playing, to: stale, animate: true }));

    expect(screen.getByRole('dialog', { name: '게임 결과' })).toBeInTheDocument();
    expect(screen.queryByTestId('game-end-banner')).not.toBeInTheDocument();
  });

  it('새 판의 첫 화면에는 결과 창이 비치지 않는다', () => {
    const next = unoView({ startedAt: 5000, participantIds: [1, 2], players: playing.players });
    const { rerender } = render(table(over, { seq: 1, from: null, to: over, animate: false }));
    expect(screen.getByRole('dialog', { name: '게임 결과' })).toBeInTheDocument();

    const seen: boolean[] = [];
    const observer = new MutationObserver(() => seen.push(Boolean(screen.queryByRole('dialog', { name: '게임 결과' }))));
    observer.observe(document.body, { childList: true, subtree: true });
    rerender(table(next, { seq: 2, from: over, to: next, animate: true }));
    observer.disconnect();

    expect(screen.queryByRole('dialog', { name: '게임 결과' })).not.toBeInTheDocument();
    expect(screen.getByTestId('uno-table')).toBeInTheDocument();
    expect(seen.every((open) => !open)).toBe(true);
  });
});

describe('우노 게임 끝 소리', () => {
  beforeEach(() => play.mockReset());
  const cues = () => play.mock.calls.filter(([name]) => name === 'gameOverWin' || name === 'gameOverEnd');

  it('끝나는 순간을 보면 "게임 끝!" 배너와 함께 한 번만 울리고, 결과 창은 라운드 소리를 내지 않는다', () => {
    vi.useFakeTimers();
    const { rerender } = render(table(playing, null));
    const transition = { seq: 2, from: playing, to: over, animate: true };

    rerender(table(over, transition));
    expect(cues()).toHaveLength(0);
    act(() => { vi.advanceTimersByTime(450); });
    expect(cues()).toEqual([['gameOverWin']]);
    act(() => { vi.advanceTimersByTime(1400); });
    rerender(table(over, transition));

    expect(screen.getByRole('dialog', { name: '게임 결과' })).toBeInTheDocument();
    expect(cues()).toHaveLength(1);
    expect(play).not.toHaveBeenCalledWith('roundWin');
  });

  it('진 사람에게는 이긴 사람과 다른 부드러운 소리를 울린다', () => {
    vi.useFakeTimers();
    const { rerender } = render(table(playing, null, 2));

    rerender(table(over, { seq: 2, from: playing, to: over, animate: true }, 2));
    act(() => { vi.advanceTimersByTime(450); });

    expect(cues()).toEqual([['gameOverEnd']]);
  });

  it('이미 끝난 화면을 받으면(다시 입장·동기화) 울리지 않는다', () => {
    render(table(over, { seq: 1, from: null, to: over, animate: false }));
    render(table(over, { seq: 1, from: playing, to: over, animate: false }));

    expect(cues()).toHaveLength(0);
  });

  it('기권으로 끝나면 배너 없이 바로 울린다', () => {
    const forfeit: UnoView = { ...over, result: { reason: 'FORFEIT', winnerId: 1, points: 0, players: [] } };
    const { rerender } = render(table(playing, null));

    rerender(table(forfeit, { seq: 2, from: playing, to: forfeit, animate: true }));

    expect(cues()).toEqual([['gameOverWin']]);
  });

  it('테이블이 내려갔다 같은 전환으로 다시 열려도 두 번 울리지 않는다', () => {
    const forfeit: UnoView = { ...over, result: { reason: 'FORFEIT', winnerId: 1, points: 0, players: [] } };
    const transition = { seq: 2, from: playing, to: forfeit, animate: true };
    const first = render(table(forfeit, transition));
    first.unmount();
    render(table(forfeit, transition));

    expect(cues()).toHaveLength(1);
  });
});
