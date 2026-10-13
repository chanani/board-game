import { describe, expect, it } from 'vitest';
import { levelAt } from './prng';

const first12 = (seed: number) => Array.from({ length: 12 }, (_, n) => levelAt(seed, n));

describe('R4 과일 순서', () => {
  it('씨앗마다 정해진 순서가 나온다', () => {
    expect(first12(0)).toEqual([4, 3, 2, 5, 2, 1, 1, 3, 1, 4, 4, 5]);
    expect(first12(12345)).toEqual([5, 5, 1, 3, 2, 3, 1, 4, 3, 3, 1, 2]);
    expect(first12(2147483647)).toEqual([3, 1, 1, 1, 3, 2, 5, 4, 1, 2, 2, 3]);
  });

  it('n번째만 따로 구해도 같고 값은 늘 1~5다', () => {
    expect(levelAt(12345, 7)).toBe(4);
    const levels = Array.from({ length: 2000 }, (_, n) => levelAt(987654321, n));
    expect(levels.every((level) => Number.isInteger(level) && level >= 1 && level <= 5)).toBe(true);
    expect(new Set(levels).size).toBe(5);
  });
});
