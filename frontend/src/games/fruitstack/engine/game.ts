import { AUTO_DROP_STEPS, BOARD_W, DROP_COOLDOWN_STEPS, DROP_Y, LINE_Y, OVER_LINE_STEPS, STEP_MS, pointsOf, radiusOf, type BoardFrame } from './constants';
import { levelAt } from './prng';
import { addFruit, createWorld, fruitsOf, stepWorld, type World } from './world';

export type GameEvent =
  | { type: 'drop' | 'autoDrop'; level: number }
  | { type: 'merge'; level: number; x: number; y: number; points: number }
  | { type: 'out' };

export type FruitGame = {
  seed: number; world: World; steps: number; dropIndex: number; score: number; aimX: number;
  heldSinceStep: number | null; lastDropStep: number | null; overSteps: number; out: boolean;
  /** R7 10초 저절로 떨어지기. 혼자 하기(S8)는 꺼서 시간 제한이 없다. */
  autoDrop: boolean;
};

export function createGame(seed: number, autoDrop = true): FruitGame {
  return { seed, world: createWorld(), steps: 0, dropIndex: 0, score: 0, aimX: BOARD_W / 2, heldSinceStep: 0, lastDropStep: null, overSteps: 0, out: false, autoDrop };
}

const upcoming = (game: FruitGame) => levelAt(game.seed, game.dropIndex);

export function heldLevel(game: FruitGame): number {
  return game.out || game.heldSinceStep === null ? 0 : upcoming(game);
}

export function nextLevel(game: FruitGame): number {
  return levelAt(game.seed, game.dropIndex + 1);
}

// R5
export function aim(game: FruitGame, x: number): void {
  const radius = radiusOf(upcoming(game));
  game.aimX = Math.min(BOARD_W - radius, Math.max(radius, x));
}

// R6·R7
function release(game: FruitGame, type: 'drop' | 'autoDrop'): GameEvent {
  const level = upcoming(game);
  aim(game, game.aimX);
  addFruit(game.world, { level, x: game.aimX, y: DROP_Y });
  game.dropIndex += 1;
  game.heldSinceStep = null;
  game.lastDropStep = game.steps;
  return { type, level };
}

export function drop(game: FruitGame): GameEvent[] {
  if (game.out || game.heldSinceStep === null) {
    return [];
  }
  return [release(game, 'drop')];
}

export function stepsAt(ms: number): number {
  return Math.max(0, Math.floor((ms * 60) / 1000 + 0.000001));
}

function isOverLine(game: FruitGame): boolean {
  return fruitsOf(game.world).some((fruit) => fruit.landed && fruit.y - radiusOf(fruit.level) < LINE_Y);
}

function stepOnce(game: FruitGame, events: GameEvent[]): void {
  const { merges } = stepWorld(game.world);
  game.steps += 1;
  merges.forEach((merge) => {
    const points = pointsOf(merge.level);
    game.score += points; // R10
    events.push({ type: 'merge', level: merge.level, x: merge.x, y: merge.y, points });
  });
  if (game.heldSinceStep === null && game.lastDropStep !== null && game.steps - game.lastDropStep >= DROP_COOLDOWN_STEPS) {
    game.heldSinceStep = game.steps; // R6
  }
  if (game.autoDrop && game.heldSinceStep !== null && game.steps - game.heldSinceStep >= AUTO_DROP_STEPS) {
    events.push(release(game, 'autoDrop')); // R7
  }
  game.overSteps = isOverLine(game) ? game.overSteps + 1 : 0; // R12
  if (game.overSteps > OVER_LINE_STEPS) {
    freeze(game); // R13
    events.push({ type: 'out' });
  }
}

// R15·R16
export function advance(game: FruitGame, untilMs: number, maxSteps: number): GameEvent[] {
  const events: GameEvent[] = [];
  const target = stepsAt(untilMs);
  let taken = 0;
  while (!game.out && game.steps < target && taken < maxSteps) {
    stepOnce(game, events);
    taken += 1;
  }
  return events;
}

export function simMs(game: FruitGame): number {
  return game.steps * STEP_MS;
}

export function autoDropLeftMs(game: FruitGame): number | null {
  if (!game.autoDrop || game.out || game.heldSinceStep === null) {
    return null;
  }
  return (AUTO_DROP_STEPS - (game.steps - game.heldSinceStep)) * STEP_MS;
}

export function frameOf(game: FruitGame): BoardFrame {
  const fruits = fruitsOf(game.world).map(({ level, x, y, angle }) => ({ level, x, y, angle }));
  return { held: heldLevel(game), aimX: game.aimX, danger: game.overSteps > 0, fruits };
}

export function freeze(game: FruitGame): void {
  game.out = true;
  game.heldSinceStep = null;
}
