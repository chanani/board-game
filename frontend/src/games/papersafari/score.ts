import type { BoardView, CardView } from '../../api/types';

export function columnScore(top: CardView, bottom: CardView): number {
  if (top.kind === 'WILD' || bottom.kind === 'WILD') {
    return 0;
  }
  if (top.value === bottom.value) {
    return 0;
  }
  return top.value + bottom.value;
}

export function isZeroPair(top: CardView | null, bottom: CardView | null): boolean {
  if (!top || !bottom) {
    return false;
  }
  return columnScore(top, bottom) === 0 && (top.kind === 'WILD' || bottom.kind === 'WILD' || top.value === bottom.value);
}

export function cardAt(board: BoardView, column: number, row: number): CardView | null {
  return board.slots.find((slot) => slot.column === column && slot.row === row)?.card ?? null;
}

function partialScore(card: CardView | null): number {
  if (!card || card.kind === 'WILD') {
    return 0;
  }
  return card.value;
}

export function estimateBoard(board: BoardView): { score: number; hidden: number } {
  let score = 0;
  for (const column of [0, 1, 2]) {
    const top = cardAt(board, column, 0);
    const bottom = cardAt(board, column, 1);
    score += top && bottom ? columnScore(top, bottom) : partialScore(top) + partialScore(bottom);
  }
  const hidden = board.slots.filter((slot) => slot.card === null).length;
  return { score, hidden };
}
