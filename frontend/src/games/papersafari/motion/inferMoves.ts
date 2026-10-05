import type { BoardView, CardView, PaperSafariView, SlotView } from '../../../api/types';
import { DECK, DISCARD, handZone, slotZone, type SlotZone, type Zone } from './zones';

export type Move =
  | { kind: 'travel'; from: Zone; to: Zone; card: CardView | null }
  | { kind: 'flip'; at: SlotZone }
  | { kind: 'peek'; at: SlotZone }
  | { kind: 'deal'; playerIds: number[] };

type Change = { playerId: number; before: SlotView; after: SlotView };

function sameCard(a: CardView | null, b: CardView | null): boolean {
  return a?.kind === b?.kind && a?.value === b?.value;
}

function slotChanged(a: SlotView, b: SlotView): boolean {
  return a.faceUp !== b.faceUp || a.known !== b.known || !sameCard(a.card, b.card);
}

function findSlot(board: BoardView | undefined, column: number, row: number): SlotView | undefined {
  return board?.slots.find((slot) => slot.column === column && slot.row === row);
}

function changes(prev: PaperSafariView, next: PaperSafariView): Change[] {
  return next.round.boards.flatMap((board) => {
    const before = prev.round.boards.find((item) => item.playerId === board.playerId);
    return board.slots.flatMap((after) => {
      const old = findSlot(before, after.column, after.row);
      return old && slotChanged(old, after) ? [{ playerId: board.playerId, before: old, after }] : [];
    });
  });
}

function zoneOf(change: Change): SlotZone {
  return slotZone(change.playerId, change.after.column, change.after.row);
}

function allFaceDown(view: PaperSafariView): boolean {
  return view.round.boards.every((board) => board.slots.every((slot) => !slot.faceUp));
}

function isFreshDeal(prev: PaperSafariView | null, next: PaperSafariView): boolean {
  if (next.round.phase !== 'SETUP_FLIP' || !allFaceDown(next)) {
    return false;
  }
  return prev === null || next.roundNumber > prev.roundNumber || prev.status === 'GAME_OVER';
}

function drawMoves(prev: PaperSafariView, next: PaperSafariView): Move[] {
  const held = next.round.held;
  if (prev.round.held || !held) {
    return [];
  }
  if (held.source === 'DECK') {
    return [{ kind: 'travel', from: DECK, to: handZone(held.playerId), card: held.card }];
  }
  return [{ kind: 'travel', from: DISCARD, to: handZone(held.playerId), card: prev.round.discardTop }];
}

function placeMoves(prev: PaperSafariView, next: PaperSafariView, changed: Change[]): { moves: Move[]; used: Change[] } {
  const held = prev.round.held;
  if (!held || next.round.held) {
    return { moves: [], used: [] };
  }
  const own = changed.find((change) => change.playerId === held.playerId);
  const top = next.round.discardTop;
  if (!own) {
    return { moves: [{ kind: 'travel', from: handZone(held.playerId), to: DISCARD, card: top }], used: [] };
  }
  const target = zoneOf(own);
  const pushed = changed.find((change) => change.playerId !== held.playerId
    && change.after.column === own.after.column && change.after.row === own.after.row);
  const first: Move = { kind: 'travel', from: handZone(held.playerId), to: target, card: own.after.card };
  if (!pushed) {
    return { moves: [first, { kind: 'travel', from: target, to: DISCARD, card: top }], used: [own] };
  }
  const pushedZone = zoneOf(pushed);
  return {
    moves: [
      first,
      { kind: 'travel', from: target, to: pushedZone, card: pushed.after.card },
      { kind: 'travel', from: pushedZone, to: DISCARD, card: top },
    ],
    used: [own, pushed],
  };
}

function revealMoves(changed: Change[]): Move[] {
  const flips: Move[] = changed
    .filter((change) => !change.before.faceUp && change.after.faceUp)
    .map((change) => ({ kind: 'flip', at: zoneOf(change) }));
  const peeks: Move[] = changed
    .filter((change) => !change.after.faceUp && !change.before.known && change.after.known)
    .map((change) => ({ kind: 'peek', at: zoneOf(change) }));
  return [...flips, ...peeks];
}

export function inferMoves(prev: PaperSafariView | null, next: PaperSafariView): Move[] {
  if (next.round.phase === 'ROUND_OVER' || next.status === 'GAME_OVER') {
    return [];
  }
  if (isFreshDeal(prev, next)) {
    return [{ kind: 'deal', playerIds: next.round.boards.map((board) => board.playerId) }];
  }
  if (!prev || prev.roundNumber !== next.roundNumber) {
    return [];
  }
  const changed = changes(prev, next);
  const placed = placeMoves(prev, next, changed);
  const rest = changed.filter((change) => !placed.used.includes(change));
  return [...drawMoves(prev, next), ...placed.moves, ...revealMoves(rest)];
}
