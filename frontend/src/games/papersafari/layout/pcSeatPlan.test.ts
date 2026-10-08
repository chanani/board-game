import { describe, expect, it } from 'vitest';
import { seatRows } from '../../../table/seats';
import { pcSeatPlan, ringSeats } from './pcSeatPlan';

describe('pcSeatPlan', () => {
  it('내 자리가 있고 상대 2명(3인)은 덱을 양옆 상대 사이 가운데에 두고 보통 크기 판을 쓴다', () => {
    expect(pcSeatPlan(2, true)).toEqual({ arrangement: 'ring', opponent: 'sm', me: 'lg', piles: 'md', handOverlay: false });
  });

  it.each([1, 3, 4])('내 자리가 있고 상대 %i명이면 위 상대 · 덱 · 내 판을 세로로 쌓으므로 판과 덱을 한 단계씩 줄인다', (count) => {
    expect(pcSeatPlan(count, true)).toEqual({ arrangement: 'ring', opponent: 'xs', me: 'md', piles: 'sm', handOverlay: true });
  });

  it.each([2, 3, 4, 5])('관전자(내 판 없음)는 상대 %i명이어도 둥근 배치를 쓴다', (count) => {
    expect(pcSeatPlan(count, false)).toMatchObject({ arrangement: 'round', opponent: 'sm', me: 'lg', piles: 'md', handOverlay: false });
  });
});

describe('ringSeats', () => {
  it('위 왼쪽·위 오른쪽 둘만 있으면(3인) 양옆으로 옮겨 덱을 가운데 둔다', () => {
    expect(ringSeats(seatRows(2))).toEqual({ top: [], left: 0, right: 1 });
  });

  it.each([1, 3, 4])('상대 %i명은 위 줄 · 양옆 자리를 그대로 쓴다', (count) => {
    expect(ringSeats(seatRows(count))).toEqual(seatRows(count));
  });
});
