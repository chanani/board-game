import type { BoardView, CardView } from '../../api/types';

const COLUMNS = [0, 1, 2] as const;
const ROWS = [0, 1] as const;

/** 와일드가 복사한 값(결과 화면의 "와일드 → n" 표시용). */
export type WildCopy = { column: number; row: number; value: number };

/**
 * 와일드를 가장 유리하게 해석한 판.
 * - columns: 열 점수. 위·아래 중 가려진 칸이 있으면 null.
 * - total: 판 합계(가려진 칸이 있는 열은 보이는 카드 값만 더한 예상치).
 */
export type ResolvedBoard = { columns: (number | null)[]; total: number; wilds: WildCopy[]; values: (number | null)[][] };

export function cardAt(board: BoardView, column: number, row: number): CardView | null {
  return board.slots.find((slot) => slot.column === column && slot.row === row)?.card ?? null;
}

type Row = (CardView | null)[];

/** mask의 i번째 비트가 1이면 i번 와일드는 오른쪽, 0이면 왼쪽을 복사한다. 실제 카드에 닿지 못하면 undefined. */
function follow(row: Row, index: number, mask: number, depth: number): number | undefined {
  const card = row[index];
  if (card === null || card === undefined || depth > COLUMNS.length) {
    return undefined;
  }
  if (card.kind !== 'WILD') {
    return card.value;
  }
  const next = index + ((mask >> index) & 1 ? 1 : -1);
  return follow(row, next, mask, depth + 1);
}

function resolveWith(row: Row, mask: number): (number | null)[] | undefined {
  const values = row.map((card, index) => (card === null ? null : follow(row, index, mask, 0)));
  return values.includes(undefined) ? undefined : (values as (number | null)[]);
}

/** 한 줄에서 가능한 와일드 해석들. 복사할 실제 카드가 없으면 와일드는 0. 가려진 칸은 복사할 수 없다. */
function rowCandidates(row: Row): (number | null)[][] {
  const seen = new Map<string, (number | null)[]>();
  for (let mask = 0; mask < 1 << COLUMNS.length; mask += 1) {
    const values = resolveWith(row, mask);
    if (values) {
      seen.set(values.join(','), values);
    }
  }
  if (seen.size > 0) {
    return [...seen.values()];
  }
  return [row.map((card) => (card === null ? null : card.kind === 'WILD' ? 0 : card.value))];
}

function columnOf(top: number | null, bottom: number | null): number | null {
  if (top === null || bottom === null) {
    return null;
  }
  return top === bottom ? 0 : top + bottom;
}

function partialOf(top: number | null, bottom: number | null): number {
  return columnOf(top, bottom) ?? (top ?? 0) + (bottom ?? 0);
}

function evaluate(top: (number | null)[], bottom: (number | null)[]) {
  const columns = COLUMNS.map((column) => columnOf(top[column], bottom[column]));
  const total = COLUMNS.reduce<number>((sum, column) => sum + partialOf(top[column], bottom[column]), 0);
  return { columns, total, values: [top, bottom] };
}

function wildsOf(board: BoardView, values: (number | null)[][]): WildCopy[] {
  return ROWS.flatMap((row) => COLUMNS
    .filter((column) => cardAt(board, column, row)?.kind === 'WILD')
    .map((column) => ({ column, row, value: values[row][column] ?? 0 })));
}

/** 공식 규칙: 와일드는 같은 줄 바로 왼쪽/오른쪽 값을 복사하고(연쇄 가능), 판 합계가 가장 낮은 조합을 고른다. 백엔드 BoardScore와 같다. */
export function resolveBoard(board: BoardView): ResolvedBoard {
  const [tops, bottoms] = ROWS.map((row) => rowCandidates(COLUMNS.map((column) => cardAt(board, column, row))));
  const best = tops
    .flatMap((top) => bottoms.map((bottom) => evaluate(top, bottom)))
    .reduce((min, candidate) => (candidate.total < min.total ? candidate : min));
  return { ...best, wilds: wildsOf(board, best.values) };
}

/** 위·아래가 모두 보이고 해석한 값이 같아 0점이 된 열. */
export function zeroPairColumns(board: BoardView): number[] {
  const { values } = resolveBoard(board);
  return COLUMNS.filter((column) => values[0][column] !== null && values[0][column] === values[1][column]);
}

export function estimateBoard(board: BoardView): { score: number; hidden: number } {
  const hidden = board.slots.filter((slot) => slot.card === null).length;
  return { score: resolveBoard(board).total, hidden };
}
