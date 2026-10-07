import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OldMaidView, Room } from '../../api/types';
import { LANDSCAPE_PHONE_QUERY } from '../../lib/useTableLayout';
import { setMediaMatches } from '../../test/media';
import { OldMaidTable } from './OldMaidTable';
import { oldMaidSession } from './oldMaidFixtures';

const member = (id: number, nickname: string) => ({ id, nickname, host: id === 1, connected: true, offlineSeconds: 0, ready: false });
const room = (count: number): Room => ({
  code: 'OLDMAD', name: '도둑잡기 방', gameType: 'OLD_MAID', gameTypeName: '도둑잡기', status: 'PLAYING', hostId: 1, maxPlayers: 6,
  locked: false, spectators: [], theme: 'WOOD',
  members: ['앨리스', '밥', '캐롤', '데이브', '에린', '프랭크'].slice(0, count).map((name, index) => member(index + 1, name)),
});
const nicknameOf = (id: number) => room(6).members.find((candidate) => candidate.id === id)?.nickname ?? '떠난 플레이어';

function table(overrides: Partial<OldMaidView> = {}, meId = 1, count = 3) {
  return (
    <OldMaidTable view={oldMaidSession(overrides)} room={room(count)} meId={meId} log={[]} receivedAt={0} now={0} errorSeq={0}
      nicknameOf={nicknameOf} send={vi.fn()} sendSignal={vi.fn()} signal={null} onCloseGameOver={vi.fn()} onReadyNext={vi.fn()} />
  );
}

const sixPlayers = (): Partial<OldMaidView> => ({
  participantIds: [1, 2, 3, 4, 5, 6],
  players: [1, 2, 3, 4, 5, 6].map((playerId) => ({ playerId, cardCount: 5, rank: null, forfeited: false })),
});

beforeEach(() => setMediaMatches(true));

describe('OldMaidTable 배치', () => {
  it('PC 3명: 상대 둘은 위 줄 왼쪽·오른쪽(내 다음 사람이 왼쪽)', () => {
    render(table());

    const top = within(screen.getByTestId('seat-row-top')).getAllByTestId('oldmaid-seat');
    expect(top.map((seat) => seat.getAttribute('data-player'))).toEqual(['2', '3']);
    expect(screen.getByTestId('oldmaid-table')).toHaveAttribute('data-layout', 'pc');
  });

  it('PC 4명: 내 다음 사람(내가 뽑는 상대)이 왼쪽, 그다음이 위, 마지막이 오른쪽', () => {
    render(table({
      participantIds: [1, 2, 3, 4],
      players: [1, 2, 3, 4].map((playerId) => ({ playerId, cardCount: 3, rank: null, forfeited: false })),
    }, 1, 4));

    expect(within(screen.getByTestId('seat-left')).getByRole('group', { name: /^밥, 카드 3장/ })).toBeInTheDocument();
    expect(within(screen.getByTestId('seat-row-top')).getByRole('group', { name: /^캐롤, 카드/ })).toBeInTheDocument();
    expect(within(screen.getByTestId('seat-right')).getByRole('group', { name: /^데이브, 카드/ })).toBeInTheDocument();
  });

  it('6명이면 위 줄 3자리와 양옆에 앉힌다', () => {
    render(table(sixPlayers(), 1, 6));

    expect(within(screen.getByTestId('seat-row-top')).getAllByTestId('oldmaid-seat')).toHaveLength(3);
    expect(within(screen.getByTestId('seat-left')).getAllByTestId('oldmaid-seat')).toHaveLength(1);
    expect(within(screen.getByTestId('seat-right')).getAllByTestId('oldmaid-seat')).toHaveLength(1);
  });

  it('관전자는 6명 모두 앉힌다', () => {
    render(table({ ...sixPlayers(), hand: null, viewerId: 99, currentPlayerId: 6, targetId: 1 }, 99, 6));

    const seated = screen.getAllByTestId('oldmaid-seat').map((seat) => seat.getAttribute('data-player'));
    expect(seated).toHaveLength(6);
    expect(new Set(seated)).toEqual(new Set(['1', '2', '3', '4', '5', '6']));
    expect(within(screen.getByTestId('seat-row-top')).getAllByTestId('oldmaid-seat')).toHaveLength(4);
    expect(within(screen.getByTestId('seat-right')).getByRole('group', { name: /^프랭크, 카드/ })).toBeInTheDocument();
  });

  it('세로 휴대폰은 상대를 한 줄에, 눕힌 휴대폰은 왼쪽 칸과 테이블로 나눈다', () => {
    setMediaMatches(false);
    const { unmount } = render(table(sixPlayers(), 1, 6));
    expect(within(screen.getByTestId('opponent-row')).getAllByTestId('oldmaid-seat')).toHaveLength(5);
    unmount();

    setMediaMatches((query) => query === LANDSCAPE_PHONE_QUERY);
    render(table());
    expect(screen.getByTestId('landscape-table')).toBeInTheDocument();
  });

  it('눕힌 휴대폰에 상대가 5명이면 옆 칸에 세 줄로 쌓지 않고 상대를 위 줄에, 가운데를 그 아래에 둔다', () => {
    setMediaMatches((query) => query === LANDSCAPE_PHONE_QUERY);
    const { unmount } = render(table());
    expect(screen.getByTestId('opponent-row')).toHaveAttribute('data-placement', 'side');
    unmount();

    render(table(sixPlayers(), 1, 6));
    expect(screen.getByTestId('opponent-row')).toHaveAttribute('data-placement', 'top');
    expect(within(screen.getByTestId('opponent-row')).getAllByTestId('oldmaid-seat')).toHaveLength(5);
  });

  it('내가 뽑는 사람이면 안내·리본·가운데 상대 부채가 보인다', () => {
    render(table({ players: [
      { playerId: 1, cardCount: 2, rank: null, forfeited: false },
      { playerId: 2, cardCount: 4, rank: null, forfeited: false },
      { playerId: 3, cardCount: 2, rank: null, forfeited: false },
    ] }));

    expect(screen.getByTestId('instruction')).toHaveTextContent('밥님의 카드를 1장 고르세요.');
    expect(screen.getByTestId('my-turn-badge')).toBeInTheDocument();
    expect(screen.getByTestId('my-turn-ribbon')).toBeInTheDocument();
    expect(screen.getByTestId('pick-caption')).toHaveTextContent('밥님의 카드를 1장 고르세요');
    expect(within(screen.getByTestId('target-fan')).getAllByTestId('target-card')).toHaveLength(4);
    expect(screen.getByRole('group', { name: '내 카드 2장' })).toBeInTheDocument();
  });

  it('내가 상대면 가운데 부채 없이 내 손패에서 들림을 본다', () => {
    render(table({ currentPlayerId: 3, targetId: 1, peek: { index: 1, seq: 2 } }));

    expect(screen.queryByTestId('target-fan')).not.toBeInTheDocument();
    expect(screen.getByTestId('pick-caption')).toHaveTextContent('내 카드를 고르고 있어요');
    expect(screen.getAllByTestId('my-card')[1]).toHaveAttribute('data-lifted', 'true');
    expect(screen.queryByTestId('my-turn-ribbon')).not.toBeInTheDocument();
  });

  it('남의 차례면 그 상대의 부채와 자리 부채가 들린다', () => {
    render(table({ currentPlayerId: 2, targetId: 3, peek: { index: 0, seq: 2 } }));

    expect(screen.getByTestId('instruction')).toHaveTextContent('밥님이 캐롤님의 카드를 고르는 중…');
    expect(within(screen.getByTestId('target-fan')).getAllByTestId('target-card')[0]).toHaveAttribute('data-lifted', 'true');
    expect(within(screen.getByRole('group', { name: /^캐롤, 카드/ })).getAllByTestId('seat-back')[0]).toHaveAttribute('data-lifted', 'true');
  });

  it('관전자는 손패 대신 관전 안내', () => {
    render(table({ hand: null }, 99));

    expect(screen.getByText('관전 중이에요')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /^내 카드/ })).not.toBeInTheDocument();
  });

  it('버린 짝은 모두에게 보인다', () => {
    render(table({ discardCount: 2, recentPairs: [[{ id: 0, suit: 'SPADES', rank: 'ACE' }, { id: 13, suit: 'HEARTS', rank: 'ACE' }]] }));

    expect(screen.getByRole('group', { name: '버린 카드 2장, 맨 위 스페이드 A·하트 A' })).toBeInTheDocument();
  });
});
