import { act, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OldMaidView, Room } from '../../api/types';
import { SILENT_SOUND, SoundContext } from '../../lib/sound';
import { setMediaMatches } from '../../test/media';
import { planOldMaidMotion, DRAW_MS, SUDDEN_DEATH_DRAW_MS } from './motion/planOldMaidMotion';
import { OldMaidTable } from './OldMaidTable';
import { oldMaidEvent, oldMaidView } from './oldMaidFixtures';
import { HEARTBEAT_MS, isSuddenDeath, SUDDEN_DEATH_CALLOUT_MS } from './suddenDeath';

const player = (playerId: number, cardCount: number, rank: number | null = null) => ({ playerId, cardCount, rank, forfeited: false, openingDone: true });
/** 3명 판에서 3이 먼저 끝냈고, 1(1장)이 2(2장)에게서 뽑을 차례. */
const sudden = (overrides: Partial<OldMaidView> = {}) => oldMaidView({
  players: [player(1, 1), player(2, 2), player(3, 0, 1)], hand: [{ id: 2, suit: 'SPADES', rank: 'THREE' }], ...overrides,
});

const room: Room = {
  code: 'OLDMAD', name: '방', gameType: 'OLD_MAID', gameTypeName: '도둑잡기', status: 'PLAYING', hostId: 1, maxPlayers: 6,
  locked: false, spectators: [], theme: 'WOOD',
  members: ['앨리스', '밥', '캐롤'].map((nickname, index) => ({ id: index + 1, nickname, host: index === 0, connected: true, offlineSeconds: 0, ready: false })),
};
const nicknameOf = (id: number) => room.members.find((member) => member.id === id)?.nickname ?? '떠난 플레이어';

function table(game: OldMaidView, meId = 1, play = vi.fn()) {
  return (
    <SoundContext.Provider value={{ ...SILENT_SOUND, play }}>
      <OldMaidTable view={{ gameType: 'OLD_MAID', game }} room={room} meId={meId} log={[]} receivedAt={0} now={0} errorSeq={0}
        nicknameOf={nicknameOf} send={vi.fn()} sendSignal={vi.fn()} signal={null} onCloseGameOver={vi.fn()} onReadyNext={vi.fn()} />
    </SoundContext.Provider>
  );
}

beforeEach(() => setMediaMatches(true));
afterEach(() => vi.useRealTimers());

describe('isSuddenDeath', () => {
  it('카드 가진 두 사람이 1장과 2장이고 1장 쪽이 뽑을 차례면 서든데스', () => {
    expect(isSuddenDeath(sudden())).toBe(true);
  });

  it('세 사람이 아직 카드를 들고 있으면 아니다', () => {
    expect(isSuddenDeath(oldMaidView({ players: [player(1, 1), player(2, 2), player(3, 2)] }))).toBe(false);
  });

  it('2장 쪽이 1장 쪽에서 뽑으면(결과가 정해져 있다) 아니다', () => {
    expect(isSuddenDeath(sudden({ currentPlayerId: 2, targetId: 1 }))).toBe(false);
  });

  it('짝 버리기·처음 버리기 단계나 끝난 게임은 아니다', () => {
    expect(isSuddenDeath(sudden({ stage: 'DISCARD' }))).toBe(false);
    expect(isSuddenDeath(sudden({ stage: 'OPENING_DISCARD', currentPlayerId: null, targetId: null }))).toBe(false);
    expect(isSuddenDeath(sudden({ status: 'GAME_OVER', stage: null }))).toBe(false);
  });

  it('1장 대 3장처럼 다른 장수면 아니다', () => {
    expect(isSuddenDeath(oldMaidView({ players: [player(1, 1), player(2, 3), player(3, 0, 1)] }))).toBe(false);
  });
});

describe('서든데스 연출', () => {
  it('들어서면 "서든데스" 알림이 1.5초 뜨고, 같은 판에서는 다시 뜨지 않는다', () => {
    vi.useFakeTimers();
    const play = vi.fn();
    const { rerender } = render(table(oldMaidView(), 1, play));
    expect(screen.queryByTestId('sudden-death-callout')).not.toBeInTheDocument();

    rerender(table(sudden(), 1, play));
    expect(screen.getByTestId('sudden-death-callout')).toHaveTextContent('서든데스');
    expect(play).toHaveBeenCalledWith('suddenDeath');

    act(() => vi.advanceTimersByTime(SUDDEN_DEATH_CALLOUT_MS + 300));
    expect(screen.queryByTestId('sudden-death-callout')).not.toBeInTheDocument();

    // 조커를 뽑아 차례가 넘어가 다시 서든데스가 되어도 같은 판이면 알림은 없다.
    rerender(table(sudden({ turnSeq: 2, currentPlayerId: 2, targetId: 1, players: [player(1, 2), player(2, 1), player(3, 0, 1)] }), 1, play));
    expect(screen.queryByTestId('sudden-death-callout')).not.toBeInTheDocument();
    expect(play.mock.calls.filter(([name]) => name === 'suddenDeath')).toHaveLength(1);

    // 새 판에서는 다시 뜬다.
    rerender(table(sudden({ startedAt: 2000 }), 1, play));
    expect(screen.getByTestId('sudden-death-callout')).toBeInTheDocument();
  });

  it('남은 두 사람만 비추고 나머지 자리는 흐리게, 뽑히는 2장은 떨리고 심장 소리가 되풀이된다', () => {
    vi.useFakeTimers();
    const play = vi.fn();
    render(table(sudden(), 1, play));

    const seats = screen.getAllByTestId('oldmaid-seat');
    const wrapperOf = (id: string) => seats.find((seat) => seat.getAttribute('data-player') === id)!.parentElement!;
    expect(wrapperOf('2')).toHaveAttribute('data-spotlit', 'true');
    expect(wrapperOf('3')).not.toHaveAttribute('data-spotlit');
    expect(wrapperOf('3').className).toContain('opacity-40');
    expect(screen.getByTestId('my-area').className).toContain('sudden-pulse');
    expect(screen.getByTestId('sudden-vignette')).toBeInTheDocument();
    expect(within(screen.getByTestId('target-fan')).getAllByTestId('tremble')).toHaveLength(2);

    act(() => vi.advanceTimersByTime(HEARTBEAT_MS * 2));
    expect(play.mock.calls.filter(([name]) => name === 'heartbeat')).toHaveLength(2);
  });

  it('서든데스가 아니면 비추기·떨림이 없다', () => {
    render(table(oldMaidView()));

    expect(screen.queryByTestId('sudden-vignette')).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('tremble')).toHaveLength(0);
  });

  it('서든데스의 뽑기는 천천히 날아온다', () => {
    const before = sudden({ events: [] });
    const after = sudden({ stage: 'DISCARD', events: [oldMaidEvent(3, 'DRAW', { actorId: 1, targetId: 2 })] });
    const calm = oldMaidView({ events: [] });

    expect(planOldMaidMotion(before, after, 3).flights[0].duration).toBe(SUDDEN_DEATH_DRAW_MS);
    expect(planOldMaidMotion(calm, { ...calm, events: [oldMaidEvent(3, 'DRAW', { actorId: 1, targetId: 2 })] }, 3).flights[0].duration).toBe(DRAW_MS);
  });
});
