import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Room, UnoView } from '../../api/types';
import { UnoTable } from './UnoTable';
import { num, unoEvent, unoView } from './unoFixtures';

const toast = vi.hoisted(() => ({ show: vi.fn() }));
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

function table(game: UnoView, transition: { seq: number; from: UnoView | null; to: UnoView; animate: boolean } | null) {
  return (
    <UnoTable view={{ gameType: 'UNO', game }} room={room} meId={1} log={[]} receivedAt={0} now={0} errorSeq={0}
      nicknameOf={(id) => (id === 1 ? '앨리스' : '밥')} send={vi.fn()} onCloseGameOver={vi.fn()} onReadyNext={vi.fn()} transition={transition} />
  );
}

afterEach(() => vi.useRealTimers());

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
