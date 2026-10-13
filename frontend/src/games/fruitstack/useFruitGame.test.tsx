import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FruitStackView } from '../../api/types';
import { createGame, type GameEvent } from './engine/game';
import { FRUIT_STARTED_AT, fruitPlayer, fruitView } from './fruitStackFixtures';
import { runTick, useFruitGame } from './useFruitGame';

const KEY = 'bg.fruit:ABCDEF:1';
let clock = FRUIT_STARTED_AT;
const now = () => clock;
let tick: () => void = () => {};
const ticker = (run: () => void) => {
  tick = run;
  return () => { tick = () => {}; };
};

function open(game: FruitStackView = fruitView(), meId = 1) {
  return renderHook(
    (props: { game: FruitStackView }) => useFruitGame({ code: 'ABCDEF', meId, game: props.game, storage: window.localStorage, ticker, now }),
    { initialProps: { game } },
  );
}

const pass = (ms: number) => act(() => {
  clock += ms;
  tick();
});

describe('useFruitGame', () => {
  beforeEach(() => {
    clock = FRUIT_STARTED_AT;
    tick = () => {};
    window.localStorage.clear();
  });

  it('R34 진행 중인 화면을 받으면 빈 판으로 시작해 첫 과일을 든다', () => {
    const { result } = open();

    expect(result.current.hasBoard).toBe(true);
    expect(result.current.hud).toEqual({ score: 0, held: 5, next: 5, danger: false, out: false, catchingUp: false });
    expect(result.current.getFrame()).toEqual({ held: 5, aimX: 180, danger: false, fruits: [] });
    expect(result.current.getLocal()).toEqual({ score: 0, out: false });
  });

  it('관전자와 기권한 사람에게는 판이 없다', () => {
    const spectator = open(fruitView(), 9).result;
    const forfeited = open(fruitView({ players: [fruitPlayer(1, 0, 'FORFEITED'), fruitPlayer(2)] })).result;

    [spectator, forfeited].forEach((result) => {
      expect(result.current.hasBoard).toBe(false);
      expect(result.current.getFrame()).toBeNull();
      expect(result.current.getLocal()).toBeNull();
      expect(result.current.getAutoDropLeftMs()).toBeNull();
      expect(() => act(() => { result.current.aim(100); result.current.drop(); })).not.toThrow();
    });
  });

  it('R15 판의 시계는 경기 경과 시간을 따라간다', () => {
    const { result } = open();

    pass(1000);

    expect(result.current.elapsedMs()).toBe(1000);
    expect(result.current.getAutoDropLeftMs()).toBeCloseTo(9000, 0);
  });

  it('R15 화면의 serverNow로 시작 시각을 맞춘다', () => {
    clock = FRUIT_STARTED_AT + 4200;
    const { result, rerender } = open(fruitView({ serverNow: FRUIT_STARTED_AT + 4000 }));

    expect(result.current.elapsedMs()).toBe(4000);

    // 늦게 닿은 화면(지연 300ms)으로는 시작 시각을 늦추지 않는다: 가장 이른 값을 쓴다.
    clock += 1300;
    rerender({ game: fruitView({ serverNow: FRUIT_STARTED_AT + 5000 }) });
    expect(result.current.elapsedMs()).toBe(5300);
  });

  it('R6 떨어뜨리면 알림이 가고 조준한 자리에 과일이 생긴다', () => {
    const { result } = open();
    const listener = vi.fn();
    result.current.onEvents(listener);

    act(() => {
      result.current.aim(100);
      result.current.drop();
    });

    expect(listener).toHaveBeenCalledWith([{ type: 'drop', level: 5 }]);
    expect(result.current.getFrame()?.fruits[0]).toMatchObject({ level: 5, x: 100, y: 45 });
    expect(result.current.hud.held).toBe(0);
  });

  it('R16 한 틱에 300걸음까지만 밟고 밀리는 동안 입력을 받지 않는다', () => {
    const { result } = open();
    const listener = vi.fn();
    result.current.onEvents(listener);

    pass(20_000);

    expect(result.current.hud.catchingUp).toBe(true);
    act(() => result.current.drop());
    expect(listener.mock.calls.flat(2).some((event: GameEvent) => event.type === 'drop')).toBe(false);

    pass(0);
    pass(0);
    pass(0);
    expect(result.current.hud.catchingUp).toBe(false);
  });

  it('R7 자리를 비운 동안의 자동 떨어뜨리기도 일어난다', () => {
    const { result } = open();
    const listener = vi.fn();
    result.current.onEvents(listener);

    pass(10_600);
    pass(0);
    pass(0);

    expect(listener.mock.calls.flat(2)).toContainEqual({ type: 'autoDrop', level: 5 });
    expect(result.current.hud.held).toBe(5);
  });

  it('R21 화면의 내 점수가 더 크면 내 점수를 올린다', () => {
    const { result, rerender } = open();

    rerender({ game: fruitView({ players: [fruitPlayer(1, 40), fruitPlayer(2)] }) });

    expect(result.current.getLocal()?.score).toBe(40);
    pass(0);
    expect(result.current.hud.score).toBe(40);
  });

  it('R21 화면에서 내가 탈락이면 내 판을 멈춘다', () => {
    const { result, rerender } = open();

    rerender({ game: fruitView({ players: [fruitPlayer(1, 0, 'OUT'), fruitPlayer(2)] }) });

    expect(result.current.getLocal()?.out).toBe(true);
    pass(0);
    expect(result.current.hud.out).toBe(true);
    expect(result.current.hud.held).toBe(0);
  });

  it('R32 1초마다 판을 저장하고 R34 다시 열면 이어진다', () => {
    const first = open();
    act(() => {
      first.result.current.aim(100);
      first.result.current.drop();
    });
    expect(window.localStorage.getItem(KEY)).toBeNull();

    pass(1100);
    expect(window.localStorage.getItem(KEY)).not.toBeNull();
    first.unmount();

    const again = open();
    expect(again.result.current.getFrame()?.fruits).toHaveLength(1);
    pass(0);
    expect(again.result.current.hud.held).toBe(5);
  });

  it('R32 탭이 가려지거나 페이지를 떠날 때도 저장한다', () => {
    open();

    act(() => { window.dispatchEvent(new Event('pagehide')); });

    expect(window.localStorage.getItem(KEY)).not.toBeNull();
  });

  it('R33 다른 경기의 저장은 버리고 다른 방의 저장은 지운다', () => {
    window.localStorage.setItem('bg.fruit:ZZZZZZ:1', '{}');
    window.localStorage.setItem(KEY, JSON.stringify({ v: 1, startedAt: FRUIT_STARTED_AT - 1, seed: 12345, simMs: 0, dropIndex: 3, score: 9, aimX: 180, heldSinceMs: 0, lastDropMs: null, overMs: 0, out: false, fruits: [[1, 100, 500, 0, 0, 0, 0, 1]] }));
    window.localStorage.setItem('bg.muted', '1');

    const { result } = open();

    expect(window.localStorage.getItem('bg.fruit:ZZZZZZ:1')).toBeNull();
    expect(window.localStorage.getItem(KEY)).toBeNull();
    expect(window.localStorage.getItem('bg.muted')).toBe('1');
    expect(result.current.getFrame()?.fruits).toEqual([]);
  });

  it('R33 게임이 끝나면 저장을 지우고 판은 마지막 모습으로 남는다', () => {
    const { result, rerender } = open();
    act(() => result.current.drop());
    pass(1100);
    expect(window.localStorage.getItem(KEY)).not.toBeNull();

    rerender({ game: fruitView({ status: 'GAME_OVER', deadline: null }) });

    expect(window.localStorage.getItem(KEY)).toBeNull();
    expect(result.current.getFrame()?.fruits).toHaveLength(1);
    const y = result.current.getFrame()?.fruits[0].y;
    pass(5000);
    expect(result.current.getFrame()?.fruits[0].y).toBe(y);
    act(() => { window.dispatchEvent(new Event('pagehide')); });
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it('같은 방의 다음 경기가 시작되면 새 판으로 바뀐다', () => {
    const { result, rerender } = open();
    act(() => result.current.drop());

    clock += 60_000;
    rerender({ game: fruitView({ startedAt: FRUIT_STARTED_AT + 60_000, serverNow: FRUIT_STARTED_AT + 60_000, seed: 0 }) });

    expect(result.current.getFrame()).toEqual({ held: 4, aimX: 180, danger: false, fruits: [] });
    expect(result.current.elapsedMs()).toBe(0);
  });

  it('runTick은 걸음 상한과 시간 한도에서 멈춘다', () => {
    const capped = createGame(1);
    runTick(capped, 20_000, { maxSteps: 300, budgetMs: null, now });
    expect(capped.steps).toBe(300);

    let ticking = 0;
    const slow = createGame(1);
    runTick(slow, 20_000, { maxSteps: 300, budgetMs: 12, now: () => (ticking += 5) });
    expect(slow.steps % 30).toBe(0);
    expect(slow.steps).toBeGreaterThan(0);
    expect(slow.steps).toBeLessThan(300);
  });

  it('합치기 효과는 150ms 동안만 있다', () => {
    const { result } = open();
    const events: GameEvent[] = [];
    result.current.onEvents((batch) => events.push(...batch));
    act(() => result.current.drop());
    pass(500);
    act(() => result.current.drop());

    const merged = () => events.some((event) => event.type === 'merge');
    for (let ms = 1000; ms <= 8000 && !merged(); ms += 100) {
      pass(100);
    }

    expect(merged()).toBe(true);
    const effects = result.current.getEffects();
    expect(effects).toHaveLength(1);
    expect(effects[0].progress).toBeGreaterThanOrEqual(0);
    expect(effects[0].progress).toBeLessThan(1);
    expect(effects[0].radius).toBe(37);
    clock += 200;
    expect(result.current.getEffects()).toEqual([]);
  });
});
