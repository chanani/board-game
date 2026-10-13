import { describe, expect, it } from 'vitest';
import type { BoardFrame, FrameFruit } from './constants';
import { blend, matchFruits } from './interpolate';

const fruit = (level: number, x: number, y: number, angle = 0): FrameFruit => ({ level, x, y, angle });
const board = (fruits: FrameFruit[], aimX = 180, held = 1): BoardFrame => ({ held, aimX, danger: false, fruits });

describe('R25 짝짓기', () => {
  it('단계가 같고 가장 가까운 이전 과일과 잇는다', () => {
    const prev = [fruit(1, 100, 500), fruit(1, 200, 500), fruit(2, 105, 500)];
    const next = [fruit(1, 190, 505), fruit(1, 110, 505)];

    expect(matchFruits(prev, next)).toEqual([1, 0]);
  });

  it('거리가 80을 넘거나 단계가 다르면 잇지 않는다', () => {
    expect(matchFruits([fruit(1, 100, 100)], [fruit(1, 100, 181)])).toEqual([null]);
    expect(matchFruits([fruit(1, 100, 100)], [fruit(1, 100, 180)])).toEqual([0]);
    expect(matchFruits([fruit(2, 100, 100)], [fruit(1, 100, 100)])).toEqual([null]);
  });

  it('이전 과일 하나는 한 번만 쓴다', () => {
    expect(matchFruits([fruit(1, 100, 100)], [fruit(1, 101, 100), fruit(1, 102, 100)])).toEqual([0, null]);
  });
});

describe('R25 보간', () => {
  it('이어진 과일의 위치와 조준 x를 선형으로 보간한다', () => {
    const mixed = blend(board([fruit(3, 100, 400)], 100), board([fruit(3, 120, 440)], 200, 4), 0.25);

    expect(mixed.fruits[0]).toMatchObject({ level: 3, x: 105, y: 410 });
    expect(mixed.aimX).toBe(125);
    expect(mixed.held).toBe(4);
  });

  it('각도는 짧은 쪽으로 돈다', () => {
    const mixed = blend(board([fruit(3, 100, 400, 6.2)]), board([fruit(3, 100, 400, 0.1)]), 0.5);

    expect(mixed.fruits[0].angle).toBeCloseTo(6.2 + (0.1 + 2 * Math.PI - 6.2) / 2, 5);
  });

  it('새 과일은 제자리에 바로 나타나고 사라진 과일은 그리지 않는다', () => {
    const mixed = blend(board([fruit(1, 50, 500), fruit(1, 300, 500)]), board([fruit(2, 60, 495)]), 0.5);

    expect(mixed.fruits).toEqual([fruit(2, 60, 495)]);
  });

  it('이전 판이 없거나 t가 1 이상이면 최신 판 그대로, 0 이하면 이전 위치다', () => {
    const next = board([fruit(3, 120, 440)], 200);
    const prev = board([fruit(3, 100, 400)], 100);

    expect(blend(null, next, 0.3)).toBe(next);
    expect(blend(prev, next, 1)).toBe(next);
    expect(blend(prev, next, 5)).toBe(next);
    expect(blend(prev, next, -1).fruits[0]).toMatchObject({ x: 100, y: 400 });
  });
});
