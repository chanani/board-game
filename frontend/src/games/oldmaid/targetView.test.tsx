import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OldMaidView, Room } from '../../api/types';
import { setMediaMatches } from '../../test/media';
import { OldMaidTable } from './OldMaidTable';
import { card, JOKER, oldMaidSession } from './oldMaidFixtures';

const room: Room = {
  code: 'OLDMAD', name: '방', gameType: 'OLD_MAID', gameTypeName: '도둑잡기', status: 'PLAYING', hostId: 1, maxPlayers: 6,
  locked: false, spectators: [], theme: 'WOOD',
  members: ['앨리스', '밥', '캐롤'].map((nickname, index) => ({ id: index + 1, nickname, host: index === 0, connected: true, offlineSeconds: 0, ready: false })),
};
const nicknameOf = (id: number) => room.members.find((member) => member.id === id)?.nickname ?? '떠난 플레이어';
const player = (playerId: number, cardCount: number, rank: number | null = null) => ({ playerId, cardCount, rank, forfeited: false, openingDone: true });
/** 나(1)는 손패를 비우고 1등으로 끝냈고, 2(밥)가 3(캐롤)에게서 뽑을 차례. */
const watching = (overrides: Partial<OldMaidView> = {}): Partial<OldMaidView> => ({
  currentPlayerId: 2, targetId: 3, hand: [], players: [player(1, 0, 1), player(2, 2), player(3, 3)],
  targetHand: [card('HEARTS', 'NINE'), JOKER, card('DIAMONDS', 'SEVEN')], ...overrides,
});

function table(overrides: Partial<OldMaidView>, signalIndex: number | null = null) {
  return (
    <OldMaidTable view={oldMaidSession(overrides)} room={room} meId={1} log={[]} receivedAt={0} now={0} errorSeq={0}
      nicknameOf={nicknameOf} send={vi.fn()} sendSignal={vi.fn()} onCloseGameOver={vi.fn()} onReadyNext={vi.fn()}
      signal={signalIndex === null ? null : { gameType: 'OLD_MAID', type: 'PEEK', startedAt: 1000, turnSeq: 1, drawerId: 2, targetId: 3, index: signalIndex, seq: 9 }} />
  );
}

beforeEach(() => setMediaMatches(true));

describe('끝낸 사람의 뽑히는 사람 시점', () => {
  it('뽑히는 사람의 손패를 앞면으로 그 순서대로 펼치고 시점 안내를 단다', () => {
    render(table(watching()));

    expect(screen.getByTestId('target-view-label')).toHaveTextContent('고름 당하는 캐롤님 시점');
    const fan = screen.getByTestId('target-fan');
    expect(fan).toHaveAttribute('aria-label', '캐롤님의 카드 3장, 앞면');
    const cards = within(fan).getAllByTestId('target-card');
    expect(cards.map((one) => one.getAttribute('data-face'))).toEqual(['true', 'true', 'true']);
    expect(within(cards[1]).getByTestId('joker-art')).toBeInTheDocument();
    expect(within(cards[0]).queryByTestId('joker-art')).not.toBeInTheDocument();
  });

  it('뽑는 사람이 고르는 자리를 앞면 위에서도 들어 보인다', () => {
    render(table(watching(), 1));

    const cards = within(screen.getByTestId('target-fan')).getAllByTestId('target-card');
    expect(cards[1]).toHaveAttribute('data-lifted', 'true');
  });

  it('뽑히는 사람이 바뀌면 새 사람의 손패를 본다', () => {
    const { rerender } = render(table(watching()));
    rerender(table(watching({ turnSeq: 2, currentPlayerId: 3, targetId: 2, targetHand: [card('SPADES', 'FOUR'), card('CLUBS', 'TEN')] })));

    expect(screen.getByTestId('target-view-label')).toHaveTextContent('고름 당하는 밥님 시점');
    expect(within(screen.getByTestId('target-fan')).getAllByTestId('target-card')).toHaveLength(2);
  });

  it('서버가 손패를 주지 않으면(아직 하는 사람·관전자) 뒷면 그대로이고 안내도 없다', () => {
    render(table({ currentPlayerId: 2, targetId: 3, players: [player(1, 2), player(2, 2), player(3, 3)], targetHand: null }));

    expect(screen.queryByTestId('target-view-label')).not.toBeInTheDocument();
    const cards = within(screen.getByTestId('target-fan')).getAllByTestId('target-card');
    expect(cards.every((one) => !one.hasAttribute('data-face'))).toBe(true);
  });
});
