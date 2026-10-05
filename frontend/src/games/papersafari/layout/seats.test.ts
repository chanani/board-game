import { describe, expect, it } from 'vitest';
import { seatOrder, seatPositions } from './seats';

describe('seats', () => {
  it('나 다음 사람부터 시계방향으로 상대를 나열한다', () => {
    expect(seatOrder([5, 1, 9, 3], 9)).toEqual([3, 5, 1]);
    expect(seatOrder([1, 2], 1)).toEqual([2]);
  });

  it('관전자(내가 없는 판)는 처음부터 모두 나열한다', () => {
    expect(seatOrder([4, 6], 99)).toEqual([4, 6]);
  });

  it.each([
    [1, ['top']],
    [2, ['top-left', 'top-right']],
    [3, ['left', 'top', 'right']],
    [4, ['left', 'top-left', 'top-right', 'right']],
  ])('상대 %i명의 자리', (count, expected) => {
    expect(seatPositions(count)).toEqual(expected);
  });
});
