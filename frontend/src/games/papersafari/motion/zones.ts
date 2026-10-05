export type Zone =
  | { kind: 'deck' }
  | { kind: 'discard' }
  | { kind: 'hand'; playerId: number }
  | { kind: 'slot'; playerId: number; column: number; row: number };
export type SlotZone = Extract<Zone, { kind: 'slot' }>;

export const DECK: Zone = { kind: 'deck' };
export const DISCARD: Zone = { kind: 'discard' };

export function handZone(playerId: number): Zone {
  return { kind: 'hand', playerId };
}

export function slotZone(playerId: number, column: number, row: number): SlotZone {
  return { kind: 'slot', playerId, column, row };
}

export function zoneKey(zone: Zone): string {
  if (zone.kind === 'hand') {
    return `hand:${zone.playerId}`;
  }
  if (zone.kind === 'slot') {
    return `slot:${zone.playerId}:${zone.column}:${zone.row}`;
  }
  return zone.kind;
}
