import { describe, expect, it } from 'vitest';
import { card, oldMaidSession } from './oldMaidFixtures';
import { isStaleDiscard } from './staleDiscard';

const pairA = card('SPADES', 'THREE');
const pairB = card('HEARTS', 'THREE');
const other = card('CLUBS', 'NINE');
const discard = { type: 'DISCARD' as const, cardIds: [pairA.id, pairB.id] };
const openingSent = oldMaidSession({ stage: 'OPENING_DISCARD', turnSeq: 0, currentPlayerId: null, targetId: null, hand: [pairA, pairB, other], canDiscard: true });

describe('isStaleDiscard', () => {
  it('처음 버리기 마감에 서버가 먼저 버려 단계가 바뀐 뒤 온 거절은 지나간 버리기다', () => {
    const after = oldMaidSession({ stage: 'DRAW', turnSeq: 1, hand: [other] });

    expect(isStaleDiscard(discard, openingSent, after, 'INVALID_PHASE')).toBe(true);
    expect(isStaleDiscard(discard, openingSent, after, 'NOT_YOUR_TURN')).toBe(true);
  });

  it('짝 버리기 단계에 차례가 넘어간 뒤 온 NOT_YOUR_TURN도 지나간 버리기다', () => {
    const sent = oldMaidSession({ stage: 'DISCARD', turnSeq: 4, hand: [pairA, pairB, other], canDiscard: true });
    const after = oldMaidSession({ stage: 'DRAW', turnSeq: 5, currentPlayerId: 2, targetId: 3, hand: [other] });

    expect(isStaleDiscard(discard, sent, after, 'NOT_YOUR_TURN')).toBe(true);
  });

  it('같은 단계여도 고른 카드가 손에서 사라졌으면(기권 손패를 넘겨받아 서버가 버림) 지나간 버리기다', () => {
    const after = oldMaidSession({ stage: 'OPENING_DISCARD', turnSeq: 0, currentPlayerId: null, targetId: null, hand: [other] });

    expect(isStaleDiscard(discard, openingSent, after, 'OLD_MAID_CARD_NOT_IN_HAND')).toBe(true);
  });

  it('화면이 그대로면 같은 오류도 알린다', () => {
    expect(isStaleDiscard(discard, openingSent, openingSent, 'OLD_MAID_CARD_NOT_IN_HAND')).toBe(false);
    expect(isStaleDiscard(discard, openingSent, openingSent, 'INVALID_PHASE')).toBe(false);
  });

  it('다른 오류·다른 행동은 화면이 지나갔어도 알린다', () => {
    const after = oldMaidSession({ stage: 'DRAW', turnSeq: 1, hand: [other] });

    expect(isStaleDiscard(discard, openingSent, after, 'OLD_MAID_NOT_A_PAIR')).toBe(false);
    expect(isStaleDiscard({ type: 'DRAW', index: 0 }, openingSent, after, 'NOT_YOUR_TURN')).toBe(false);
  });
});
