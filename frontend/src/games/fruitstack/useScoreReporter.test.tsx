import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FruitStackView } from '../../api/types';
import { FRUIT_STARTED_AT, fruitPlayer, fruitView } from './fruitStackFixtures';
import { useScoreReporter } from './useScoreReporter';

let clock = FRUIT_STARTED_AT;
const now = () => clock;
const advance = (ms: number) => act(() => {
  clock += ms;
  vi.advanceTimersByTime(ms);
});

type Props = { game: FruitStackView; connected: boolean; errorSeq: number };

function open(overrides: Partial<Props> = {}, extra: { elapsedMs?: () => number; getLocal?: () => { score: number; out: boolean } | null } = {}) {
  const send = vi.fn();
  const local = { score: 0, out: false };
  const hook = renderHook(
    (props: Props) => useScoreReporter({ send, meId: 1, getLocal: extra.getLocal ?? (() => local), elapsedMs: extra.elapsedMs ?? (() => 10_000), now, ...props }),
    { initialProps: { game: fruitView(), connected: true, errorSeq: 0, ...overrides } },
  );
  const poke = () => act(() => hook.result.current.poke());
  return { ...hook, send, local, poke };
}

const sent = (send: ReturnType<typeof vi.fn>) => send.mock.calls.map(([action]) => action);

describe('useScoreReporter', () => {
  beforeEach(() => {
    clock = FRUIT_STARTED_AT;
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('R18 점수가 오르면 바로 보내고 500ms 안의 다음 점수는 묶어 한 번 보낸다', () => {
    const { send, local, poke } = open();

    local.score = 10;
    poke();
    local.score = 16;
    poke();
    local.score = 31;
    poke();
    expect(sent(send)).toEqual([{ type: 'SCORE', score: 10 }]);
    advance(500);

    expect(sent(send)).toEqual([{ type: 'SCORE', score: 10 }, { type: 'SCORE', score: 31 }]);
  });

  it('화면의 내 점수가 따라오면 더 보내지 않는다', () => {
    const { send, local, poke, rerender } = open();
    local.score = 10;
    poke();

    rerender({ game: fruitView({ players: [fruitPlayer(1, 10), fruitPlayer(2)] }), connected: true, errorSeq: 0 });
    advance(2000);

    expect(send).toHaveBeenCalledTimes(1);
  });

  it('R18 경기 마지막 3초에는 묶지 않는다', () => {
    const { send, local, poke } = open({}, { elapsedMs: () => 598_000 });

    local.score = 10;
    poke();
    local.score = 20;
    poke();

    expect(sent(send)).toEqual([{ type: 'SCORE', score: 10 }, { type: 'SCORE', score: 20 }]);
  });

  it('R21 끊긴 동안에는 보내지 않고 다시 붙으면 가장 최근 점수를 한 번 보낸다', () => {
    const { send, local, poke, rerender } = open({ connected: false });

    local.score = 10;
    poke();
    local.score = 25;
    poke();
    advance(3000);
    expect(send).not.toHaveBeenCalled();

    rerender({ game: fruitView(), connected: true, errorSeq: 0 });
    expect(sent(send)).toEqual([{ type: 'SCORE', score: 25 }]);
  });

  it('R20 내 판이 탈락하면 탈락을 보내고 화면이 탈락이 될 때까지 1초마다 다시 보낸다', () => {
    const { send, local, poke, rerender } = open();

    local.score = 30;
    local.out = true;
    poke();
    advance(1000);
    rerender({ game: fruitView({ players: [fruitPlayer(1, 30, 'OUT'), fruitPlayer(2)] }), connected: true, errorSeq: 0 });
    advance(3000);

    expect(sent(send)).toEqual([{ type: 'OUT', score: 30 }, { type: 'OUT', score: 30 }]);
  });

  it('R21 errorSeq가 오르면 다음 보고를 5초 미룬다', () => {
    const { send, local, poke, rerender } = open();

    rerender({ game: fruitView(), connected: true, errorSeq: 1 });
    local.score = 10;
    poke();
    advance(4999);
    expect(send).not.toHaveBeenCalled();
    advance(1);

    expect(sent(send)).toEqual([{ type: 'SCORE', score: 10 }]);
  });

  it('게임이 끝났거나 내가 참가자가 아니면 보내지 않는다', () => {
    const over = open({ game: fruitView({ status: 'GAME_OVER' }) });
    over.local.score = 10;
    over.poke();
    const spectator = open({}, { getLocal: () => null });
    spectator.poke();
    advance(2000);

    expect(over.send).not.toHaveBeenCalled();
    expect(spectator.send).not.toHaveBeenCalled();
  });

  it('내리면 남은 타이머를 지운다', () => {
    const { send, local, poke, unmount } = open();
    local.score = 10;
    poke();
    local.score = 20;
    poke();

    unmount();
    advance(1000);

    expect(send).toHaveBeenCalledTimes(1);
  });
});
