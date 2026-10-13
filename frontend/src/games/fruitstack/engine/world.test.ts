import { describe, expect, it } from 'vitest';
import { BOARD_W, DROP_Y, FRUITS, pointsOf, radiusOf } from './constants';
import { addFruit, createWorld, fruitsOf, stepWorld, type Merge, type World } from './world';

function run(world: World, steps: number): Merge[] {
  const merges: Merge[] = [];
  for (let step = 0; step < steps; step += 1) {
    merges.push(...stepWorld(world).merges);
  }
  return merges;
}

const levels = (world: World) => fruitsOf(world).map((fruit) => fruit.level).sort((a, b) => a - b);

describe('과일 표', () => {
  it('R2 11단계의 반지름과 점수', () => {
    expect(FRUITS.map((fruit) => fruit.name)).toEqual(['체리', '딸기', '포도', '귤', '감', '사과', '배', '복숭아', '파인애플', '멜론', '수박']);
    expect(FRUITS.map((fruit) => fruit.radius)).toEqual([11, 15, 20, 24, 30, 37, 44, 52, 60, 70, 80]);
    expect(FRUITS.map((fruit) => fruit.points)).toEqual([1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66]);
    expect(radiusOf(11)).toBe(80);
    expect(pointsOf(5)).toBe(15);
  });
});

describe('물리 세계', () => {
  it('R11 떨어뜨린 과일은 바닥에 닿을 때 착지한다', () => {
    const world = createWorld();
    addFruit(world, { level: 1, x: 180, y: DROP_Y });
    expect(fruitsOf(world)[0].landed).toBe(false);

    run(world, 5);
    expect(fruitsOf(world)[0].landed).toBe(false);
    run(world, 400);

    const [cherry] = fruitsOf(world);
    expect(cherry.landed).toBe(true);
    expect(cherry.y).toBeGreaterThan(520);
    expect(cherry.y).toBeLessThan(531);
  });

  it('R11 옆 벽에 닿는 것은 착지가 아니다', () => {
    const world = createWorld();
    addFruit(world, { level: 1, x: 8, y: DROP_Y });

    run(world, 6);

    expect(fruitsOf(world)[0].landed).toBe(false);
  });

  it('R8 같은 자리에 체리 두 개를 떨어뜨리면 딸기 하나가 된다', () => {
    const world = createWorld();
    addFruit(world, { level: 1, x: 180, y: DROP_Y });
    run(world, 200);
    addFruit(world, { level: 1, x: 180, y: DROP_Y });

    const merges = run(world, 300);

    expect(merges).toHaveLength(1);
    expect(merges[0].level).toBe(1);
    expect(levels(world)).toEqual([2]);
    expect(fruitsOf(world)[0].landed).toBe(true);
  });

  it('R8 한 걸음에 과일 하나는 한 번만 합쳐진다', () => {
    const world = createWorld();
    addFruit(world, { level: 1, x: 100, y: 500, landed: true });
    addFruit(world, { level: 1, x: 115, y: 500, landed: true });
    addFruit(world, { level: 1, x: 130, y: 500, landed: true });

    const { merges } = stepWorld(world);

    expect(merges).toHaveLength(1);
    expect(levels(world)).toEqual([1, 2]);
  });

  it('R8 새 과일의 x는 벽 안으로 자른다', () => {
    const world = createWorld();
    addFruit(world, { level: 10, x: 70, y: 460, landed: true });
    addFruit(world, { level: 10, x: 72, y: 330, landed: true });

    const { merges } = stepWorld(world);

    // 두 멜론의 가운데 x는 71이지만 수박 반지름 80으로 자른다. y는 한 걸음의 중력만큼만 395에서 벗어난다.
    expect(merges).toHaveLength(1);
    expect(merges[0]).toMatchObject({ level: 10, x: 80 });
    expect(Math.abs(merges[0].y - 395)).toBeLessThan(1);
    expect(fruitsOf(world)).toHaveLength(1);
    expect(fruitsOf(world)[0]).toMatchObject({ level: 11, x: 80, landed: true });
  });

  it('R9 수박 두 개는 사라지고 새 과일이 없다', () => {
    const world = createWorld();
    addFruit(world, { level: 11, x: 100, y: 400, landed: true });
    addFruit(world, { level: 11, x: 250, y: 400, landed: true });

    const { merges } = stepWorld(world);

    expect(merges).toHaveLength(1);
    expect(merges[0].level).toBe(11);
    expect(fruitsOf(world)).toEqual([]);
  });

  it('단계가 다른 과일은 닿아도 합쳐지지 않는다', () => {
    const world = createWorld();
    addFruit(world, { level: 1, x: 100, y: 500, landed: true });
    addFruit(world, { level: 2, x: 118, y: 500, landed: true });

    expect(run(world, 30)).toEqual([]);
    expect(levels(world)).toEqual([1, 2]);
  });

  it('R14 판 밖으로 빠진 과일은 없앤다', () => {
    const world = createWorld();
    addFruit(world, { level: 3, x: 180, y: 700 });

    expect(stepWorld(world).merges).toEqual([]);
    expect(fruitsOf(world)).toEqual([]);
  });

  it('과일은 들어온 순서로 나오고 속도와 각도를 넣은 대로 시작한다', () => {
    const world = createWorld();
    const first = addFruit(world, { level: 4, x: 60, y: 300, vx: 1.5, vy: -2, angle: 0.5, angularVelocity: 0.1 });
    const second = addFruit(world, { level: 6, x: BOARD_W - 60, y: 300 });

    const fruits = fruitsOf(world);

    expect(fruits.map((fruit) => fruit.id)).toEqual([first, second]);
    expect(fruits[0]).toMatchObject({ level: 4, x: 60, y: 300, angle: 0.5, landed: false });
    expect(fruits[0].vx).toBeCloseTo(1.5, 5);
    expect(fruits[0].vy).toBeCloseTo(-2, 5);
    expect(fruits[0].angularVelocity).toBeCloseTo(0.1, 5);
  });
});
