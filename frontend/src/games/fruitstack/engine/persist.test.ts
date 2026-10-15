import { beforeEach, describe, expect, it } from 'vitest';
import { advance, aim, createGame, drop, heldLevel } from './game';
import { boardKey, clearOtherBoards, loadBoard, removeBoard, restore, saveBoard, serialize, type BoardStorage } from './persist';
import { fruitsOf } from './world';

const STARTED_AT = 1_791_900_000_000;
const ALL = Number.MAX_SAFE_INTEGER;

function played() {
  const game = createGame(12345);
  aim(game, 120);
  drop(game);
  advance(game, 2000, ALL);
  aim(game, 240);
  drop(game);
  advance(game, 2300, ALL);
  return game;
}

describe('R32~R34 판 저장과 복원', () => {
  beforeEach(() => window.localStorage.clear());

  it('키는 방 코드와 회원 id로 만든다', () => {
    expect(boardKey('ABCDEF', 7)).toBe('bg.fruit:ABCDEF:7');
  });

  it('저장한 판을 복원하면 시각·점수·과일이 같다', () => {
    const game = played();

    const saved = serialize(game, STARTED_AT);
    const again = restore(JSON.parse(JSON.stringify(saved)));

    expect(saved).toMatchObject({ v: 1, startedAt: STARTED_AT, seed: 12345, dropIndex: 2, score: 0, aimX: 240, out: false });
    expect(saved.simMs).toBe(2300);
    expect(saved.lastDropMs).toBe(2000);
    expect(saved.heldSinceMs).toBeNull();
    expect(saved.fruits).toHaveLength(2);
    expect(saved.fruits[0]).toHaveLength(8);
    expect(again.steps).toBe(game.steps);
    expect(again.dropIndex).toBe(2);
    expect(again.lastDropStep).toBe(game.lastDropStep);
    expect(again.heldSinceStep).toBeNull();
    expect(again.aimX).toBe(240);
    const before = fruitsOf(game.world);
    const after = fruitsOf(again.world);
    expect(after.map((fruit) => [fruit.level, fruit.landed])).toEqual(before.map((fruit) => [fruit.level, fruit.landed]));
    after.forEach((fruit, index) => {
      expect(fruit.x).toBeCloseTo(before[index].x, 1);
      expect(fruit.y).toBeCloseTo(before[index].y, 1);
      expect(fruit.vy).toBeCloseTo(before[index].vy, 1);
    });
  });

  it('복원한 판은 이어서 돈다', () => {
    const again = restore(serialize(played(), STARTED_AT));

    advance(again, 2500, ALL);

    expect(again.steps).toBe(150);
    expect(heldLevel(again)).toBe(1);
  });

  it('탈락한 판도 그대로 복원된다', () => {
    const game = played();
    game.out = true;
    game.overSteps = 121;

    const again = restore(serialize(game, STARTED_AT));

    expect(again.out).toBe(true);
    expect(again.overSteps).toBe(121);
    expect(heldLevel(again)).toBe(0);
  });

  it('R33 같은 경기의 저장만 읽고 다르면 지운다', () => {
    const key = boardKey('ABCDEF', 7);
    saveBoard(window.localStorage, key, serialize(played(), STARTED_AT));

    expect(loadBoard(window.localStorage, key, { startedAt: STARTED_AT, seed: 12345 })?.dropIndex).toBe(2);
    expect(loadBoard(window.localStorage, key, { startedAt: STARTED_AT + 1, seed: 12345 })).toBeNull();
    expect(window.localStorage.getItem(key)).toBeNull();

    saveBoard(window.localStorage, key, serialize(played(), STARTED_AT));
    expect(loadBoard(window.localStorage, key, { startedAt: STARTED_AT, seed: 999 })).toBeNull();
    window.localStorage.setItem(key, '{"v":2}');
    expect(loadBoard(window.localStorage, key, { startedAt: STARTED_AT, seed: 12345 })).toBeNull();
    window.localStorage.setItem(key, '깨진 글');
    expect(loadBoard(window.localStorage, key, { startedAt: STARTED_AT, seed: 12345 })).toBeNull();
    expect(loadBoard(window.localStorage, 'bg.fruit:NONE:1', { startedAt: STARTED_AT, seed: 12345 })).toBeNull();
  });

  it('R33 지금 키가 아닌 수박게임 저장만 지운다', () => {
    window.localStorage.setItem('bg.fruit:AAAAAA:7', '{}');
    window.localStorage.setItem('bg.fruit:BBBBBB:7', '{}');
    window.localStorage.setItem('bg.muted', '1');

    clearOtherBoards(window.localStorage, 'bg.fruit:BBBBBB:7');

    expect(window.localStorage.getItem('bg.fruit:AAAAAA:7')).toBeNull();
    expect(window.localStorage.getItem('bg.fruit:BBBBBB:7')).toBe('{}');
    expect(window.localStorage.getItem('bg.muted')).toBe('1');
    removeBoard(window.localStorage, 'bg.fruit:BBBBBB:7');
    expect(window.localStorage.getItem('bg.fruit:BBBBBB:7')).toBeNull();
  });

  it('R32 저장소가 예외를 던져도 조용히 넘어간다', () => {
    const broken: BoardStorage = {
      length: 1,
      key: () => { throw new Error('막힘'); },
      getItem: () => { throw new Error('막힘'); },
      setItem: () => { throw new Error('막힘'); },
      removeItem: () => { throw new Error('막힘'); },
    };

    expect(() => saveBoard(broken, 'bg.fruit:A:1', serialize(played(), STARTED_AT))).not.toThrow();
    expect(loadBoard(broken, 'bg.fruit:A:1', { startedAt: STARTED_AT, seed: 12345 })).toBeNull();
    expect(() => clearOtherBoards(broken, null)).not.toThrow();
    expect(() => removeBoard(broken, 'bg.fruit:A:1')).not.toThrow();
  });
});
