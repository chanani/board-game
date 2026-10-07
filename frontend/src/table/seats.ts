export type SeatPosition = 'left' | 'top-left' | 'top' | 'top-right' | 'right';

const POSITIONS: Record<number, SeatPosition[]> = {
  0: [],
  1: ['top'],
  2: ['top-left', 'top-right'],
  3: ['left', 'top', 'right'],
  4: ['left', 'top-left', 'top-right', 'right'],
  5: ['left', 'top-left', 'top', 'top-right', 'right'],
};

export function seatOrder(playerIds: number[], meId: number): number[] {
  const index = playerIds.indexOf(meId);
  if (index < 0) {
    return [...playerIds];
  }
  return [...playerIds.slice(index + 1), ...playerIds.slice(0, index)];
}

export function seatPositions(count: number): SeatPosition[] {
  return POSITIONS[count] ?? POSITIONS[5];
}

export type SeatRows = { top: number[]; left: number | null; right: number | null };

// PC 테이블은 위 줄(위 왼쪽·위·위 오른쪽)과 가운데 줄 양옆(왼쪽·오른쪽)으로 나눠 앉혀 서로 겹치지 않게 한다.
export function seatRows(count: number): SeatRows {
  const positions = seatPositions(count);
  const indexOf = (position: SeatPosition) => {
    const index = positions.indexOf(position);
    return index < 0 ? null : index;
  };
  const top = positions.flatMap((position, index) => (position.startsWith('top') ? [index] : []));
  return { top, left: indexOf('left'), right: indexOf('right') };
}
