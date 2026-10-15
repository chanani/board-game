import { describe, expect, it } from 'vitest';
import type { GameAction, GameSignal, SessionView } from '../../api/types';
import { fruitPlayer, fruitSession, fruitView } from './fruitStackFixtures';

describe('수박게임 계약 타입과 픽스처', () => {
  it('기본 화면은 두 사람이 0점으로 게임 중이다', () => {
    const game = fruitView();
    expect(game).toMatchObject({ viewerId: 1, status: 'IN_PROGRESS', startedAt: 1_791_900_000_000, seed: 12345, participantIds: [1, 2], result: null, winnerId: null, deadline: 1_791_900_600_000, serverNow: 1_791_900_000_000 });
    expect(game.players).toEqual([{ playerId: 1, score: 0, state: 'PLAYING' }, { playerId: 2, score: 0, state: 'PLAYING' }]);
  });

  it('덮어쓴 칸만 바뀌고 세션 화면은 gameType을 단다', () => {
    const view: SessionView = fruitSession({ players: [fruitPlayer(1, 30), fruitPlayer(2, 12, 'OUT')] });
    expect(view.gameType).toBe('FRUIT_STACK');
    expect(view.game.players[1]).toEqual({ playerId: 2, score: 12, state: 'OUT' });
  });

  it('행동과 신호가 계약 모양이다', () => {
    const score: GameAction = { type: 'SCORE', score: 128 };
    const board: GameAction = { type: 'BOARD', board: 'WAAAAGAPqA' };
    const signal: GameSignal = { gameType: 'FRUIT_STACK', type: 'BOARD', startedAt: 1_791_900_000_000, playerId: 2, seq: 1, board: 'WAAAAGAPqA' };
    expect([score.type, board.type, signal.type]).toEqual(['SCORE', 'BOARD', 'BOARD']);
  });
});
