import { STEP_MS } from './constants';
import { createGame, type FruitGame } from './game';
import { addFruit, fruitsOf } from './world';

export const BOARD_KEY_PREFIX = 'bg.fruit:';
export type SavedBoard = {
  v: 1; startedAt: number; seed: number; simMs: number; dropIndex: number; score: number; aimX: number;
  heldSinceMs: number | null; lastDropMs: number | null; overMs: number; out: boolean; fruits: number[][];
};
export type BoardStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;

export const boardKey = (code: string, meId: number) => `${BOARD_KEY_PREFIX}${code}:${meId}`;

const round2 = (value: number) => Math.round(value * 100) / 100;
const toMs = (steps: number) => round2(steps * STEP_MS);
const toSteps = (ms: number) => Math.round(ms / STEP_MS);
const maybe = <T, U>(value: T | null, map: (value: T) => U): U | null => (value === null ? null : map(value));

export function serialize(game: FruitGame, startedAt: number): SavedBoard {
  return {
    v: 1, startedAt, seed: game.seed, simMs: toMs(game.steps), dropIndex: game.dropIndex, score: game.score, aimX: round2(game.aimX),
    heldSinceMs: maybe(game.heldSinceStep, toMs), lastDropMs: maybe(game.lastDropStep, toMs), overMs: toMs(game.overSteps), out: game.out,
    fruits: fruitsOf(game.world).map((fruit) => [fruit.level, round2(fruit.x), round2(fruit.y), round2(fruit.vx), round2(fruit.vy), round2(fruit.angle), round2(fruit.angularVelocity), fruit.landed ? 1 : 0]),
  };
}

export function restore(saved: SavedBoard, autoDrop = true): FruitGame {
  const game = createGame(saved.seed, autoDrop);
  game.steps = toSteps(saved.simMs);
  game.dropIndex = saved.dropIndex;
  game.score = saved.score;
  game.aimX = saved.aimX;
  game.heldSinceStep = maybe(saved.heldSinceMs, toSteps);
  game.lastDropStep = maybe(saved.lastDropMs, toSteps);
  game.overSteps = toSteps(saved.overMs);
  game.out = saved.out;
  saved.fruits.forEach(([level, x, y, vx, vy, angle, angularVelocity, landed]) =>
    addFruit(game.world, { level, x, y, vx, vy, angle, angularVelocity, landed: landed === 1 }));
  return game;
}

// 저장소가 막힌 환경(비공개 창 등)에서는 조용히 넘어간다.
function quietly<T>(run: () => T, fallback: T): T {
  try {
    return run();
  } catch {
    return fallback;
  }
}

export function saveBoard(storage: BoardStorage, key: string, saved: SavedBoard): void {
  quietly(() => storage.setItem(key, JSON.stringify(saved)), undefined);
}

export function removeBoard(storage: BoardStorage, key: string): void {
  quietly(() => storage.removeItem(key), undefined);
}

// R33
export function loadBoard(storage: BoardStorage, key: string, match: { startedAt: number; seed: number }): SavedBoard | null {
  const saved = quietly(() => JSON.parse(storage.getItem(key) ?? 'null') as SavedBoard | null, null);
  if (saved && saved.v === 1 && saved.startedAt === match.startedAt && saved.seed === match.seed && Array.isArray(saved.fruits)) {
    return saved;
  }
  removeBoard(storage, key);
  return null;
}

export function clearOtherBoards(storage: BoardStorage, keepKey: string | null): void {
  const keys = quietly(() => Array.from({ length: storage.length }, (_, index) => storage.key(index)), [] as (string | null)[]);
  keys.filter((key): key is string => key !== null && key.startsWith(BOARD_KEY_PREFIX) && key !== keepKey)
    .forEach((key) => removeBoard(storage, key));
}
