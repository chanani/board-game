import { Bodies, Body, Composite, Engine, Events } from 'matter-js';
import { BOARD_H, BOARD_W, FALL_OUT_Y, MAX_LEVEL, STEP_MS, WALL, radiusOf } from './constants';

export type FruitBody = { id: number; level: number; landed: boolean; x: number; y: number; vx: number; vy: number; angle: number; angularVelocity: number };
export type NewFruit = { level: number; x: number; y: number; vx?: number; vy?: number; angle?: number; angularVelocity?: number; landed?: boolean };
export type Merge = { level: number; x: number; y: number };

type Entry = { body: Body; level: number; landed: boolean };
type Pair = [Body, Body];
/** fruits는 들어온 순서를 지킨다(Map). started·active는 한 걸음 동안 엔진이 알려 준 쌍. */
export type World = { engine: Engine; fruits: Map<number, Entry>; started: Pair[]; active: Pair[] };

const FRUIT = 'fruit';
const FLOOR = 'floor';
const SIDE = 'wall';
const WALL_OPTIONS = { isStatic: true, friction: 0.3, restitution: 0 };
const FRUIT_OPTIONS = { restitution: 0.15, friction: 0.3, frictionStatic: 0.5, frictionAir: 0.01, density: 0.001, label: FRUIT };

export function createWorld(): World {
  const engine = Engine.create({ enableSleeping: false, positionIterations: 8, velocityIterations: 6 });
  engine.gravity.x = 0;
  engine.gravity.y = 1;
  engine.gravity.scale = 0.001;
  Composite.add(engine.world, [
    Bodies.rectangle(-WALL / 2, BOARD_H / 2, WALL, BOARD_H * 3, { ...WALL_OPTIONS, label: SIDE }),
    Bodies.rectangle(BOARD_W + WALL / 2, BOARD_H / 2, WALL, BOARD_H * 3, { ...WALL_OPTIONS, label: SIDE }),
    Bodies.rectangle(BOARD_W / 2, BOARD_H + WALL / 2, BOARD_W + WALL * 2, WALL, { ...WALL_OPTIONS, label: FLOOR }),
  ]);
  const world: World = { engine, fruits: new Map(), started: [], active: [] };
  Events.on(engine, 'collisionStart', (event) => event.pairs.forEach((pair) => world.started.push([pair.bodyA, pair.bodyB])));
  Events.on(engine, 'collisionActive', (event) => event.pairs.forEach((pair) => world.active.push([pair.bodyA, pair.bodyB])));
  return world;
}

export function addFruit(world: World, fruit: NewFruit): number {
  const body = Bodies.circle(fruit.x, fruit.y, radiusOf(fruit.level), FRUIT_OPTIONS);
  Body.setAngle(body, fruit.angle ?? 0);
  Body.setVelocity(body, { x: fruit.vx ?? 0, y: fruit.vy ?? 0 });
  Body.setAngularVelocity(body, fruit.angularVelocity ?? 0);
  Composite.add(world.engine.world, body);
  world.fruits.set(body.id, { body, level: fruit.level, landed: fruit.landed ?? false });
  return body.id;
}

function remove(world: World, body: Body): void {
  Composite.remove(world.engine.world, body);
  world.fruits.delete(body.id);
}

// R11: 다른 과일이나 바닥에 처음 닿으면 착지. 옆 벽은 아니다.
function land(world: World, [a, b]: Pair): void {
  const lands = (other: Body) => other.label === FRUIT || other.label === FLOOR;
  const entryA = world.fruits.get(a.id);
  const entryB = world.fruits.get(b.id);
  if (entryA && lands(b)) {
    entryA.landed = true;
  }
  if (entryB && lands(a)) {
    entryB.landed = true;
  }
}

// R8·R9: 이미 합쳐진 과일은 fruits에서 빠졌으므로 다시 잡히지 않는다(한 걸음에 한 번).
function merge(world: World, [a, b]: Pair): Merge | null {
  const entryA = world.fruits.get(a.id);
  const entryB = world.fruits.get(b.id);
  if (!entryA || !entryB || entryA.level !== entryB.level) {
    return null;
  }
  const level = entryA.level;
  const next = Math.min(level + 1, MAX_LEVEL);
  const radius = radiusOf(next);
  const x = Math.min(BOARD_W - radius, Math.max(radius, (a.position.x + b.position.x) / 2));
  const y = (a.position.y + b.position.y) / 2;
  remove(world, a);
  remove(world, b);
  if (level < MAX_LEVEL) {
    addFruit(world, { level: level + 1, x, y, landed: true });
  }
  return { level, x, y };
}

export function stepWorld(world: World): { merges: Merge[] } {
  world.started.length = 0;
  world.active.length = 0;
  Engine.update(world.engine, STEP_MS);
  world.started.forEach((pair) => land(world, pair));
  const merges = [...world.started, ...world.active].flatMap((pair) => merge(world, pair) ?? []);
  // R14
  [...world.fruits.values()].filter((entry) => entry.body.position.y > FALL_OUT_Y).forEach((entry) => remove(world, entry.body));
  return { merges };
}

export function fruitsOf(world: World): FruitBody[] {
  return [...world.fruits.values()].map(({ body, level, landed }) => ({
    id: body.id, level, landed, x: body.position.x, y: body.position.y, vx: body.velocity.x, vy: body.velocity.y,
    angle: body.angle, angularVelocity: body.angularVelocity,
  }));
}
