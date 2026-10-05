export type SeatPosition = 'left' | 'top-left' | 'top' | 'top-right' | 'right';

const POSITIONS: Record<number, SeatPosition[]> = {
  0: [],
  1: ['top'],
  2: ['top-left', 'top-right'],
  3: ['left', 'top', 'right'],
  4: ['left', 'top-left', 'top-right', 'right'],
};

export function seatOrder(playerIds: number[], meId: number): number[] {
  const index = playerIds.indexOf(meId);
  if (index < 0) {
    return [...playerIds];
  }
  return [...playerIds.slice(index + 1), ...playerIds.slice(0, index)];
}

export function seatPositions(count: number): SeatPosition[] {
  return POSITIONS[count] ?? POSITIONS[4];
}
