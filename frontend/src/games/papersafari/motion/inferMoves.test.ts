import { describe, expect, it } from 'vitest';
import type { BoardView, CardView, HeldView, PaperSafariView, SlotView, TurnPhase } from '../../../api/types';
import { inferMoves } from './inferMoves';
import { DECK, DISCARD, handZone, slotZone } from './zones';

const A = 1;
const B = 2;
const C = 3;
const n = (value: number): CardView => ({ kind: 'NUMBER', value });

function board(playerId: number, overrides: Partial<Record<string, Partial<SlotView>>> = {}): BoardView {
  const slots = [0, 1, 2].flatMap((column) => [0, 1].map((row) => ({
    column, row, faceUp: false, known: false, card: null,
    ...overrides[`${column}:${row}`],
  } as SlotView)));
  return { playerId, slots };
}

type Opts = { phase?: TurnPhase; round?: number; held?: HeldView | null; discardTop?: CardView | null; boards?: BoardView[]; status?: PaperSafariView['status'] };

function view({ phase = 'DRAW', round = 1, held = null, discardTop = n(4), boards = [board(A), board(B)], status = 'IN_ROUND' }: Opts = {}): PaperSafariView {
  return {
    viewerId: A, status, roundNumber: round, lastRoundResult: null, winnerId: null,
    round: { phase, currentPlayerId: A, deckSize: 30, discardTop, held, boards },
  };
}

const up = (card: CardView): Partial<SlotView> => ({ faceUp: true, card });

describe('inferMoves', () => {
  it('이전 상태 없이 새 라운드 준비 화면이면 나눠 준다', () => {
    expect(inferMoves(null, view({ phase: 'SETUP_FLIP' }))).toEqual([{ kind: 'deal', playerIds: [A, B] }]);
  });

  it('라운드가 바뀌어 준비 화면이 되면 나눠 준다', () => {
    const prev = view({ round: 1 });
    expect(inferMoves(prev, view({ phase: 'SETUP_FLIP', round: 2 }))).toEqual([{ kind: 'deal', playerIds: [A, B] }]);
  });

  it('이미 뒤집힌 카드가 있는 준비 화면이나 이전 상태 없는 진행 화면은 움직임이 없다', () => {
    expect(inferMoves(null, view({ phase: 'SETUP_FLIP', boards: [board(A, { '0:0': up(n(1)) }), board(B)] }))).toEqual([]);
    expect(inferMoves(null, view())).toEqual([]);
  });

  it('덱에서 뽑으면 덱에서 손으로 날아간다 (남이 뽑은 카드는 뒷면)', () => {
    const next = view({ phase: 'PLACE', held: { playerId: B, source: 'DECK', card: null } });
    expect(inferMoves(view(), next)).toEqual([{ kind: 'travel', from: DECK, to: handZone(B), card: null }]);
  });

  it('버린 카드 더미에서 가져오면 이전 맨 위 카드가 손으로 간다', () => {
    const next = view({ phase: 'PLACE', discardTop: n(9), held: { playerId: A, source: 'DISCARD', card: n(4) } });
    expect(inferMoves(view({ discardTop: n(4) }), next)).toEqual([{ kind: 'travel', from: DISCARD, to: handZone(A), card: n(4) }]);
  });

  it('교체하면 손에서 칸으로, 원래 칸 카드는 더미로 간다', () => {
    const prev = view({ phase: 'PLACE', held: { playerId: A, source: 'DECK', card: n(2) } });
    const next = view({ discardTop: n(8), boards: [board(A, { '1:0': up(n(2)) }), board(B)] });

    expect(inferMoves(prev, next)).toEqual([
      { kind: 'travel', from: handZone(A), to: slotZone(A, 1, 0), card: n(2) },
      { kind: 'travel', from: slotZone(A, 1, 0), to: DISCARD, card: n(8) },
    ]);
  });

  it('버리면 손에서 더미로 간다', () => {
    const prev = view({ phase: 'PLACE', held: { playerId: A, source: 'DECK', card: n(9) } });
    expect(inferMoves(prev, view({ discardTop: n(9) }))).toEqual([{ kind: 'travel', from: handZone(A), to: DISCARD, card: n(9) }]);
  });

  it('타잔 교체는 빠진 카드가 왼쪽 사람 같은 칸으로, 그 사람 카드는 더미로 간다', () => {
    const tarzan: CardView = { kind: 'TARZAN', value: 10 };
    const prev = view({ phase: 'PLACE', held: { playerId: A, source: 'DECK', card: tarzan }, boards: [board(A), board(B), board(C)] });
    const next = view({
      discardTop: n(6),
      boards: [board(A, { '2:1': up(tarzan) }), board(B, { '2:1': up(n(3)) }), board(C)],
    });

    expect(inferMoves(prev, next)).toEqual([
      { kind: 'travel', from: handZone(A), to: slotZone(A, 2, 1), card: tarzan },
      { kind: 'travel', from: slotZone(A, 2, 1), to: slotZone(B, 2, 1), card: n(3) },
      { kind: 'travel', from: slotZone(B, 2, 1), to: DISCARD, card: n(6) },
    ]);
  });

  it('준비 단계에서 상대가 카드를 뒤집으면 제자리 뒤집기', () => {
    const prev = view({ phase: 'SETUP_FLIP', boards: [board(A, { '0:0': up(n(1)) }), board(B)] });
    const next = view({ phase: 'SETUP_FLIP', boards: [board(A, { '0:0': up(n(1)) }), board(B, { '2:0': up(n(5)) })] });

    expect(inferMoves(prev, next)).toEqual([{ kind: 'flip', at: slotZone(B, 2, 0) }]);
  });

  it('코끼리로 엿보면 엿보기', () => {
    const prev = view({ phase: 'PEEK' });
    const next = view({ boards: [board(A, { '1:1': { known: true, card: n(7) } }), board(B)] });

    expect(inferMoves(prev, next)).toEqual([{ kind: 'peek', at: slotZone(A, 1, 1) }]);
  });

  it('라운드가 끝나는 화면은 움직임을 만들지 않는다', () => {
    const prev = view({ phase: 'PLACE', held: { playerId: A, source: 'DECK', card: n(2) } });
    const next = view({ phase: 'ROUND_OVER', boards: [board(A, { '0:0': up(n(2)), '0:1': up(n(3)) }), board(B, { '1:1': up(n(4)) })] });

    expect(inferMoves(prev, next)).toEqual([]);
  });

  it('같은 카드로 앞면 칸을 교체해 칸 변화가 안 보이면 손에서 더미로 대신한다', () => {
    const prev = view({ phase: 'PLACE', held: { playerId: A, source: 'DISCARD', card: n(5) }, boards: [board(A, { '0:0': up(n(5)) }), board(B)] });
    const next = view({ discardTop: n(5), boards: [board(A, { '0:0': up(n(5)) }), board(B)] });

    expect(inferMoves(prev, next)).toEqual([{ kind: 'travel', from: handZone(A), to: DISCARD, card: n(5) }]);
  });
});
