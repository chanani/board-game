import { describe, expect, it } from 'vitest';
import { MAX_STEPS_PER_TICK } from './constants';
import { advance, aim, autoDropLeftMs, createGame, drop, frameOf, freeze, heldLevel, nextLevel, simMs, stepsAt, type FruitGame, type GameEvent } from './game';
import { addFruit, fruitsOf } from './world';

const SEED = 12345; // 과일 순서: 감(5), 감(5), 체리(1), 포도(3), …
const ALL = Number.MAX_SAFE_INTEGER;
const levels = (game: FruitGame) => fruitsOf(game.world).map((fruit) => fruit.level).sort((a, b) => a - b);
const types = (events: GameEvent[]) => events.map((event) => event.type);

describe('들기와 떨어뜨리기', () => {
  it('R5·R6 시작하면 첫 과일을 가운데에 들고 있다', () => {
    const game = createGame(SEED);

    expect(heldLevel(game)).toBe(5);
    expect(nextLevel(game)).toBe(5);
    expect(game.aimX).toBe(180);
    expect(game.score).toBe(0);
    expect(fruitsOf(game.world)).toEqual([]);
    expect(frameOf(game)).toEqual({ held: 5, aimX: 180, danger: false, fruits: [] });
  });

  it('R5 조준 x는 들고 있는 과일이 벽 안에 들게 자른다', () => {
    const game = createGame(SEED);

    aim(game, 0);
    expect(game.aimX).toBe(30);
    aim(game, 999);
    expect(game.aimX).toBe(330);
    aim(game, 200.5);
    expect(game.aimX).toBe(200.5);
  });

  it('R6 떨어뜨리면 그 자리에 과일이 들어가고 500ms 뒤에 다음 과일을 든다', () => {
    const game = createGame(SEED);
    aim(game, 100);

    expect(drop(game)).toEqual([{ type: 'drop', level: 5 }]);

    expect(heldLevel(game)).toBe(0);
    expect(game.dropIndex).toBe(1);
    expect(fruitsOf(game.world)[0]).toMatchObject({ level: 5, x: 100, y: 45, landed: false });
    expect(drop(game)).toEqual([]);
    advance(game, 499, ALL);
    expect(game.steps).toBe(29);
    expect(heldLevel(game)).toBe(0);
    advance(game, 500, ALL);
    expect(game.steps).toBe(30);
    expect(heldLevel(game)).toBe(5);
    expect(nextLevel(game)).toBe(1);
  });

  it('R7 10초 동안 떨어뜨리지 않으면 지금 자리에 저절로 떨어지고 다시 500ms 뒤에 든다', () => {
    const game = createGame(SEED);
    aim(game, 250);

    expect(types(advance(game, 9999, ALL))).toEqual([]);
    expect(autoDropLeftMs(game)).toBeCloseTo(1000 / 60, 5);
    const events = advance(game, 10000, ALL);

    expect(events).toEqual([{ type: 'autoDrop', level: 5 }]);
    expect(game.dropIndex).toBe(1);
    expect(fruitsOf(game.world)[0]).toMatchObject({ level: 5, x: 250, y: 45 });
    expect(autoDropLeftMs(game)).toBeNull();
    advance(game, 10500, ALL);
    expect(heldLevel(game)).toBe(5);
    expect(autoDropLeftMs(game)).toBeCloseTo(10000, 5);
  });
});

describe('점수와 탈락', () => {
  it('R10 같은 자리에 감 두 개를 떨어뜨리면 사과가 되고 15점이다', () => {
    const game = createGame(SEED);
    drop(game);
    advance(game, 2000, ALL);
    drop(game);

    const events = advance(game, 7000, ALL);

    const merges = events.filter((event) => event.type === 'merge');
    expect(merges).toHaveLength(1);
    expect(merges[0]).toMatchObject({ type: 'merge', level: 5, points: 15 });
    expect(game.score).toBe(15);
    expect(levels(game)).toEqual([6]);
  });

  it('R11·R12 떨어지는 중인 과일은 선 위에 있어도 세지 않는다', () => {
    const game = createGame(SEED);
    drop(game);

    advance(game, 100, ALL);

    expect(game.overSteps).toBe(0);
    expect(frameOf(game).danger).toBe(false);
  });

  it('R12·R13 착지한 과일이 선 위에 2초 넘게 있으면 탈락하고 판이 멈춘다', () => {
    const game = createGame(SEED);
    // 쌓은 탑은 2초 안에 무너져 합쳐지므로(실제 matter-js로 확인), 착지한 것으로 친 과일을 판 한참 위에서 떨어뜨린다.
    // 2초(121걸음) 동안 많아야 2100쯤 떨어지므로 그동안 윗끝이 줄곧 선(y 90) 위에 있고 아무것도 닿지 않는다.
    addFruit(game.world, { level: 9, x: 180, y: -3000, landed: true });

    advance(game, 1000, ALL);
    expect(game.out).toBe(false);
    expect(frameOf(game).danger).toBe(true);
    const events = advance(game, 5000, ALL);

    expect(types(events)).toContain('out');
    expect(game.out).toBe(true);
    expect(game.steps).toBe(121);
    expect(heldLevel(game)).toBe(0);
    expect(drop(game)).toEqual([]);
    expect(advance(game, 60000, ALL)).toEqual([]);
    expect(game.steps).toBe(121);
    expect(frameOf(game).held).toBe(0);
  });

  it('freeze는 서버가 탈락이라 할 때 판을 멈춘다', () => {
    const game = createGame(SEED);

    freeze(game);

    expect(game.out).toBe(true);
    expect(heldLevel(game)).toBe(0);
    expect(advance(game, 1000, ALL)).toEqual([]);
  });
});

describe('판의 시계', () => {
  it('R15 stepsAt은 그 시각까지의 걸음 수다', () => {
    expect([0, 16, 17, 499, 500, 1000, 10000, 600000].map(stepsAt)).toEqual([0, 0, 1, 29, 30, 60, 600, 36000]);
    expect(stepsAt(-5)).toBe(0);
  });

  it('R16 한 번에 maxSteps까지만 밟고 이어 밟으면 한 번에 밟은 것과 같다', () => {
    const chunked = createGame(SEED);
    const whole = createGame(SEED);
    drop(chunked);
    drop(whole);

    advance(chunked, 20000, MAX_STEPS_PER_TICK);
    expect(chunked.steps).toBe(300);
    expect(simMs(chunked)).toBeCloseTo(5000, 5);
    advance(chunked, 20000, MAX_STEPS_PER_TICK);
    advance(chunked, 20000, MAX_STEPS_PER_TICK);
    advance(chunked, 20000, MAX_STEPS_PER_TICK);
    advance(whole, 20000, ALL);

    expect(chunked.steps).toBe(1200);
    expect(whole.steps).toBe(1200);
    expect(chunked.dropIndex).toBe(whole.dropIndex);
    expect(chunked.score).toBe(whole.score);
    expect(levels(chunked)).toEqual(levels(whole));
  });

  it('이미 지난 시각으로는 밟지 않는다', () => {
    const game = createGame(SEED);
    advance(game, 1000, ALL);

    expect(advance(game, 500, ALL)).toEqual([]);
    expect(game.steps).toBe(60);
  });
});
