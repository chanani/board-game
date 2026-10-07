import type { GameAction, OldMaidSessionView, OldMaidView } from '../../api/types';

/** 마감 자동 버림·기권 손패 넘겨받기가 늦은 버리기보다 먼저 처리되면 서버가 돌려주는 오류. */
const STALE_DISCARD_CODES = new Set(['NOT_YOUR_TURN', 'INVALID_PHASE', 'OLD_MAID_CARD_NOT_IN_HAND']);

function movedPast(sent: OldMaidView, current: OldMaidView, cardIds: number[]) {
  if (sent.startedAt !== current.startedAt || sent.turnSeq !== current.turnSeq || sent.stage !== current.stage) {
    return true;
  }
  const held = new Set((current.hand ?? []).map((card) => card.id));
  return cardIds.some((id) => !held.has(id));
}

/**
 * R36·R37: 보낸 버리기가 거절됐는데 화면이 이미 그 버리기를 지나쳤으면(단계·차례가 바뀌었거나 고른 카드가 손에 없음) true.
 * 마감(처음 버리기 30초·짝 버리기 15초) 직전에 누른 버리기가 서버 자동 버림에 밀린 정상 경합이라 알리지 않는다.
 */
export function isStaleDiscard(action: GameAction, sent: OldMaidSessionView, current: OldMaidSessionView, code: string): boolean {
  if (action.type !== 'DISCARD' || !STALE_DISCARD_CODES.has(code)) {
    return false;
  }
  return movedPast(sent.game, current.game, action.cardIds ?? []);
}
