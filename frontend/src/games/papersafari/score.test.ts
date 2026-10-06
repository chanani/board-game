import { describe, expect, it } from 'vitest';
import type { BoardView, CardView } from '../../api/types';
import { estimateBoard, resolveBoard, zeroPairColumns } from './score';

const n = (value: number): CardView => ({ kind: 'NUMBER', value });
const elephant: CardView = { kind: 'ELEPHANT', value: 10 };
const tarzan: CardView = { kind: 'TARZAN', value: 10 };
const fox: CardView = { kind: 'FOX', value: -2 };
const W: CardView = { kind: 'WILD', value: 0 };

/** 윗줄 왼→오, 아랫줄 왼→오 순서. null은 가려진 칸. */
function board(cards: (CardView | null)[]): BoardView {
  const positions = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]];
  return {
    playerId: 1,
    slots: positions.map(([column, row], index) => ({ column, row, faceUp: cards[index] !== null, known: false, card: cards[index] })),
  };
}

const columnsOf = (cards: (CardView | null)[]) => resolveBoard(board(cards)).columns;

describe('resolveBoard (백엔드 BoardScoreTest와 같은 예시)', () => {
  it('윗줄 [여우, 와일드, 와일드]는 모두 여우로 친다', () => {
    const resolved = resolveBoard(board([fox, W, W, n(5), n(6), n(7)]));
    expect(resolved.columns).toEqual([3, 4, 5]);
    expect(resolved.total).toBe(12);
    expect(resolved.wilds).toEqual([{ column: 1, row: 0, value: -2 }, { column: 2, row: 0, value: -2 }]);
  });

  it('와일드는 양옆 중 더 낮은 값을 고른다', () => {
    expect(columnsOf([n(5), W, n(9), n(1), n(1), n(1)])).toEqual([6, 6, 10]);
  });

  it('가장자리 와일드는 하나뿐인 이웃을 복사한다', () => {
    expect(columnsOf([W, n(4), n(4), n(1), n(1), n(1)])).toEqual([5, 5, 5]);
    expect(columnsOf([n(8), n(8), W, n(1), n(1), n(1)])).toEqual([9, 9, 9]);
  });

  it('한 줄이 모두 와일드면 0이다', () => {
    expect(columnsOf([W, W, W, n(3), n(4), n(5)])).toEqual([3, 4, 5]);
  });

  it('여우 두 장, 코끼리와 타잔은 0이다', () => {
    expect(columnsOf([fox, n(1), n(2), fox, n(3), n(4)])[0]).toBe(0);
    expect(columnsOf([elephant, n(1), n(2), tarzan, n(3), n(4)])[0]).toBe(0);
  });

  it('와일드가 없으면 같은 값 0, 다르면 합이다', () => {
    const resolved = resolveBoard(board([n(3), n(7), n(2), n(5), n(7), fox]));
    expect(resolved.columns).toEqual([8, 0, 0]);
    expect(resolved.total).toBe(8);
  });

  it('복사한 값이 같은 열의 짝과 맞으면 그 열은 0이다', () => {
    expect(columnsOf([n(9), W, n(2), n(1), n(9), n(3)])).toEqual([10, 0, 5]);
  });

  it('와일드 연쇄는 이웃 와일드가 정한 값을 따른다', () => {
    expect(columnsOf([W, W, n(0), n(7), n(7), n(7)])).toEqual([7, 7, 7]);
  });

  it('와일드끼리 서로 가리키는 순환은 쓰지 않는다', () => {
    expect(resolveBoard(board([n(9), W, W, n(1), n(1), n(1)])).total).toBe(30);
    expect(resolveBoard(board([W, W, n(9), n(1), n(1), n(1)])).total).toBe(30);
  });

  it('같은 열 위아래가 모두 와일드여도 각자 줄에서 계산한다', () => {
    expect(columnsOf([n(3), W, n(6), n(4), W, n(6)])).toEqual([7, 0, 0]);
  });

  it('전체로 유리하면 더 높은 이웃을 복사해 짝과 맞춘다', () => {
    const resolved = resolveBoard(board([n(2), W, n(8), n(5), n(8), n(5)]));
    expect(resolved.columns).toEqual([7, 0, 13]);
    expect(resolved.total).toBe(20);
  });

  it('와일드와 양수 사이의 와일드는 양수를 따른다', () => {
    expect(columnsOf([W, W, n(4), n(1), n(1), n(1)])).toEqual([5, 5, 5]);
  });
});

describe('estimateBoard / zeroPairColumns', () => {
  it('보이는 카드로 예상 점수를 계산하고 가려진 장수를 센다', () => {
    // 윗줄 와일드는 왼쪽 7을 복사(가려진 칸은 이웃 후보가 아니다) → 8, 0, 7
    expect(estimateBoard(board([n(3), n(7), W, n(5), n(7), null]))).toEqual({ score: 15, hidden: 1 });
    expect(estimateBoard(board([null, null, n(9), null, null, null]))).toEqual({ score: 9, hidden: 5 });
  });

  it('가려진 칸만 이웃인 와일드는 0으로 친다', () => {
    expect(estimateBoard(board([null, W, null, null, null, null]))).toEqual({ score: 0, hidden: 5 });
  });

  it('두 장이 모두 보이고 해석한 값이 같을 때만 0점 쌍이다', () => {
    expect(zeroPairColumns(board([n(7), n(2), n(1), n(7), n(8), null]))).toEqual([0]);
    expect(zeroPairColumns(board([n(9), W, n(2), n(1), n(9), n(3)]))).toEqual([1]);
    expect(zeroPairColumns(board([n(3), W, n(5), n(1), n(9), n(4)]))).toEqual([]);
  });
});
