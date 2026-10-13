import type { FruitStackPlayerState, FruitStackPlayerView, FruitStackSessionView, FruitStackView } from '../../api/types';

export const FRUIT_STARTED_AT = 1_791_900_000_000;

export function fruitPlayer(playerId: number, score = 0, state: FruitStackPlayerState = 'PLAYING'): FruitStackPlayerView {
  return { playerId, score, state };
}

/** 두 사람(1, 2)이 0점으로 게임 중인 화면. 보는 사람은 1. */
export function fruitView(overrides: Partial<FruitStackView> = {}): FruitStackView {
  return {
    viewerId: 1, status: 'IN_PROGRESS', startedAt: FRUIT_STARTED_AT, seed: 12345, participantIds: [1, 2],
    players: [fruitPlayer(1), fruitPlayer(2)], result: null, winnerId: null,
    deadline: FRUIT_STARTED_AT + 600_000, serverNow: FRUIT_STARTED_AT, ...overrides,
  };
}

export function fruitSession(overrides: Partial<FruitStackView> = {}): FruitStackSessionView {
  return { gameType: 'FRUIT_STACK', game: fruitView(overrides) };
}
