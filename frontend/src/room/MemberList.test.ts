import { describe, expect, it } from 'vitest';
import { SEAT_POSITIONS } from './MemberList';

describe('대기실 자리 배치', () => {
  it('6명 방은 서로 다른 여섯 자리를 둔다', () => {
    const seats = SEAT_POSITIONS[6];
    expect(seats).toHaveLength(6);
    expect(new Set(seats.map((seat) => `${seat.left}:${seat.top}`)).size).toBe(6);
  });

  it('6명 방 같은 쪽 두 자리는 이름표·칩·내보내기 버튼이 다음 자리 아바타를 가리지 않게 세로로 36% 이상 떨어진다', () => {
    const seats = SEAT_POSITIONS[6];
    const left = seats.filter((seat) => seat.left === 16).map((seat) => seat.top);
    const right = seats.filter((seat) => seat.left === 84).map((seat) => seat.top);
    expect(Math.abs(left[0] - left[1])).toBeGreaterThanOrEqual(36);
    expect(Math.abs(right[0] - right[1])).toBeGreaterThanOrEqual(36);
  });
});
