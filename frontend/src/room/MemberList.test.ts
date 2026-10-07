import { describe, expect, it } from 'vitest';
import { SEAT_POSITIONS } from './MemberList';

describe('대기실 자리 배치', () => {
  it('6명 방은 서로 다른 여섯 자리를 둔다', () => {
    const seats = SEAT_POSITIONS[6];
    expect(seats).toHaveLength(6);
    expect(new Set(seats.map((seat) => `${seat.left}:${seat.top}`)).size).toBe(6);
  });
});
