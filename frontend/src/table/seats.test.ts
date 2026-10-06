import { describe, expect, it } from 'vitest';
import { seatOrder, seatPositions, seatRows } from './seats';

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

  it.each([
    [1, { top: [0], left: null, right: null }],
    [2, { top: [0, 1], left: null, right: null }],
    [3, { top: [1], left: 0, right: 2 }],
    [4, { top: [1, 2], left: 0, right: 3 }],
  ])('상대 %i명은 위 줄과 가운데 양옆으로 나눠 앉는다', (count, expected) => {
    expect(seatRows(count)).toEqual(expected);
  });
});
