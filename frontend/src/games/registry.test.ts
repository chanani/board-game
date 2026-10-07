import { describe, expect, it } from 'vitest';
import type { PaperSafariSessionView, UnoSessionView } from '../api/types';
import { gameOverKey } from '../lib/dismissals';
import { findGame, GAME_ORDER, gameOf, sessionGameType } from './registry';

const finished = {
  game: {
    status: 'GAME_OVER', winnerId: 2,
    lastRoundResult: { players: [{ playerId: 1, score: 9, outcome: 'LOSE' }, { playerId: 2, score: 3, outcome: 'WIN' }] },
    round: { boards: [{ playerId: 1, slots: [] }, { playerId: 2, slots: [] }] },
  },
} as unknown as PaperSafariSessionView;

describe('게임 등록부', () => {
  it('페이퍼 사파리를 첫 게임으로 등록한다', () => {
    const game = gameOf('PAPER_SAFARI');

    expect(GAME_ORDER[0]).toBe('PAPER_SAFARI');
    expect(game.name).toBe('페이퍼 사파리');
    expect(game.slug).toBe('paper-safari');
    expect(game.averageScoreLabel).toBe('평균 점수');
    expect(game.rules.title).toBe('페이퍼 사파리 규칙');
    expect(game.rules.slides).toHaveLength(7);
  });

  it('모르는 게임은 찾지 못한다', () => {
    expect(findGame('CHESS')).toBeUndefined();
  });

  it('화면에 gameType이 없으면 페이퍼 사파리로 본다', () => {
    expect(sessionGameType({})).toBe('PAPER_SAFARI');
    expect(sessionGameType({ gameType: 'UNO' })).toBe('UNO');
  });

  it('페이퍼 사파리 모듈은 기존 결과 판단과 닫음 키를 그대로 쓴다', () => {
    const game = gameOf('PAPER_SAFARI');

    expect(game.isGameOver(finished)).toBe(true);
    expect(game.wasParticipant(finished, 1)).toBe(true);
    expect(game.wasParticipant(finished, 9)).toBe(false);
    expect(game.gameOverKey('ABC234', finished)).toBe(gameOverKey('ABC234', finished.game));
  });

  it('우노를 두 번째 게임으로 등록한다', () => {
    const uno = gameOf('UNO');
    const view = { gameType: 'UNO', game: { status: 'GAME_OVER', startedAt: 1000, participantIds: [1, 2] } } as unknown as UnoSessionView;

    expect(GAME_ORDER.slice(0, 2)).toEqual(['PAPER_SAFARI', 'UNO']);
    expect(uno.name).toBe('우노');
    expect(uno.slug).toBe('uno');
    expect(uno.averageScoreLabel).toBe('평균 획득 점수');
    expect(uno.rules.title).toBe('우노 규칙');
    expect(uno.isGameOver(view)).toBe(true);
    expect(uno.wasParticipant(view, 2)).toBe(true);
    expect(uno.wasParticipant(view, 9)).toBe(false);
    expect(uno.gameOverKey('ABC234', view)).toBe('ABC234:UNO:1000');
  });

  it('도둑잡기를 세 번째 게임으로 등록한다', () => {
    const game = gameOf('OLD_MAID');

    expect(GAME_ORDER).toEqual(['PAPER_SAFARI', 'UNO', 'OLD_MAID']);
    expect(game.name).toBe('도둑잡기');
    expect(game.rules.slides).toHaveLength(8);
    expect(sessionGameType({ gameType: 'OLD_MAID' })).toBe('OLD_MAID');
    expect(game.gameOverKey('OLDMAD', { gameType: 'OLD_MAID', game: { startedAt: 7 } } as never)).toBe('OLDMAD:OLD_MAID:7');
  });
});
