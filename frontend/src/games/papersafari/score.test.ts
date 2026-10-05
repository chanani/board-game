import { describe, expect, it } from 'vitest';
import type { BoardView, CardView } from '../../api/types';
import { columnScore, estimateBoard, isZeroPair } from './score';

const n = (value: number): CardView => ({ kind: 'NUMBER', value });
const elephant: CardView = { kind: 'ELEPHANT', value: 10 };
const tarzan: CardView = { kind: 'TARZAN', value: 10 };
const fox: CardView = { kind: 'FOX', value: -2 };
const wild: CardView = { kind: 'WILD', value: 0 };

function board(cards: (CardView | null)[]): BoardView {
  const positions = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]];
  return {
    playerId: 1,
    slots: positions.map(([column, row], index) => ({ column, row, faceUp: cards[index] !== null, known: false, card: cards[index] })),
  };
}

describe('score', () => {
  it('다른 숫자는 더하고 같은 숫자와 와일드는 0점이다', () => {
    expect(columnScore(n(3), n(5))).toBe(8);
    expect(columnScore(n(7), n(7))).toBe(0);
    expect(columnScore(elephant, tarzan)).toBe(0);
    expect(columnScore(fox, fox)).toBe(0);
    expect(columnScore(fox, n(4))).toBe(2);
    expect(columnScore(wild, n(9))).toBe(0);
  });

  it('두 장이 모두 보일 때만 0점 쌍으로 강조한다', () => {
    expect(isZeroPair(n(7), n(7))).toBe(true);
    expect(isZeroPair(wild, n(3))).toBe(true);
    expect(isZeroPair(n(7), null)).toBe(false);
    expect(isZeroPair(n(7), n(8))).toBe(false);
  });

  it('보이는 카드로 예상 점수를 계산하고 가려진 장수를 센다', () => {
    expect(estimateBoard(board([n(3), n(7), wild, n(5), n(7), null]))).toEqual({ score: 8, hidden: 1 });
    expect(estimateBoard(board([null, null, n(9), null, null, null]))).toEqual({ score: 9, hidden: 5 });
  });
});
