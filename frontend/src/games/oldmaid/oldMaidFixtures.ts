import type { OldMaidEvent, OldMaidPeekSignal, OldMaidSessionView, OldMaidView, PlayingCard, PlayingRank, Suit } from '../../api/types';
import { JOKER_CARD, playingCard } from './cards';

export const card = (suit: Suit, rank: PlayingRank): PlayingCard => playingCard(suit, rank);
export const JOKER = JOKER_CARD;

export function oldMaidEvent(seq: number, type: OldMaidEvent['type'], fields: Partial<OldMaidEvent> = {}): OldMaidEvent {
  return { seq, type, actorId: null, targetId: null, cards: [], count: null, reason: null, auto: false, ...fields };
}

/** 기본: 3명, 나(1)가 2에게서 뽑을 차례. 내 손패 스페이드 3·하트 7, 2는 3장, 3은 2장. */
export function oldMaidView(overrides: Partial<OldMaidView> = {}): OldMaidView {
  return {
    viewerId: 1, status: 'IN_PROGRESS', stage: 'DRAW', startedAt: 1000, currentPlayerId: 1, targetId: 2, turnSeq: 1, participantIds: [1, 2, 3],
    players: [
      { playerId: 1, cardCount: 2, rank: null, forfeited: false, openingDone: true },
      { playerId: 2, cardCount: 3, rank: null, forfeited: false, openingDone: true },
      { playerId: 3, cardCount: 2, rank: null, forfeited: false, openingDone: true },
    ],
    hand: [card('SPADES', 'THREE'), card('HEARTS', 'SEVEN')], peek: { index: null, seq: 0 }, canShuffle: false, canDiscard: false,
    discardCount: 0, recentPairs: [], discards: [], result: null, winnerId: null, deadline: null, serverNow: 0,
    lastAutoActorIds: [], autoActSeq: 0, events: [],
    ...overrides,
  };
}

export function oldMaidSession(overrides: Partial<OldMaidView> = {}): OldMaidSessionView {
  return { gameType: 'OLD_MAID', game: oldMaidView(overrides) };
}

export function peekSignal(fields: Partial<OldMaidPeekSignal> = {}): OldMaidPeekSignal {
  return { gameType: 'OLD_MAID', type: 'PEEK', startedAt: 1000, turnSeq: 1, drawerId: 1, targetId: 2, index: null, seq: 1, ...fields };
}
