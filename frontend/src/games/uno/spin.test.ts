import { describe, expect, it } from 'vitest';
import { spinOf } from './UnoCenter';

describe('방향 화살표 회전', () => {
  it('눈에 보이는 회전 방향이 진행 방향과 같다', () => {
    const visible = (direction: 'CLOCKWISE' | 'COUNTER_CLOCKWISE') => {
      const { scaleX, rotate } = spinOf(direction);
      return Math.sign(scaleX * rotate);
    };

    expect(visible('CLOCKWISE')).toBe(1);
    expect(visible('COUNTER_CLOCKWISE')).toBe(-1);
  });
});
