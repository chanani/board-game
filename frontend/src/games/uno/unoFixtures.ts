import type { UnoCard, UnoColor, UnoEvent, UnoSessionView, UnoView } from '../../api/types';

export const num = (color: UnoColor, number: number, id: number): UnoCard => ({ id, kind: 'NUMBER', color, number });
export const skip = (color: UnoColor, id: number): UnoCard => ({ id, kind: 'SKIP', color, number: null });
export const reverse = (color: UnoColor, id: number): UnoCard => ({ id, kind: 'REVERSE', color, number: null });
export const drawTwo = (color: UnoColor, id: number): UnoCard => ({ id, kind: 'DRAW_TWO', color, number: null });
export const wild = (id: number): UnoCard => ({ id, kind: 'WILD', color: null, number: null });
export const wildFour = (id: number): UnoCard => ({ id, kind: 'WILD_DRAW_FOUR', color: null, number: null });

export function unoEvent(seq: number, type: UnoEvent['type'], fields: Partial<UnoEvent> = {}): UnoEvent {
  return { seq, type, actorId: null, targetId: null, card: null, color: null, count: null, reason: null, auto: false, ...fields };
}

/** 기본: 나(1)의 PLAY 차례, 3명, 현재 색 빨강, 내 손패 빨강 2·파랑 7·와일드(빨강 2와 와일드를 낼 수 있음). */
export function unoView(overrides: Partial<UnoView> = {}): UnoView {
  return {
    viewerId: 1, status: 'IN_PROGRESS', startedAt: 1000, stage: 'PLAY', currentPlayerId: 1, direction: 'CLOCKWISE',
    currentColor: 'RED', discardTop: num('RED', 5, 9), discardCount: 1, drawPileCount: 80, participantIds: [1, 2, 3],
    players: [
      { playerId: 1, cardCount: 3, unoDeclared: false },
      { playerId: 2, cardCount: 7, unoDeclared: false },
      { playerId: 3, cardCount: 7, unoDeclared: false },
    ],
    hand: [num('RED', 2, 3), num('BLUE', 7, 88), wild(100)], playableCardIds: [3, 100], wildDrawFourRisky: false,
    drawnCardId: null, canCallUno: false, unoCatch: null, canCatch: false, challenge: null, reveal: null, result: null,
    winnerId: null, deadline: null, serverNow: 0, lastAutoActorIds: [], autoActSeq: 0, events: [],
    ...overrides,
  };
}

export function unoSession(overrides: Partial<UnoView> = {}): UnoSessionView {
  return { gameType: 'UNO', game: unoView(overrides) };
}
