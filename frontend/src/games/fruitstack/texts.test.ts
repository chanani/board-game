import { describe, expect, it } from 'vitest';
import { fruitPlayer, fruitView, soloView } from './fruitStackFixtures';
import { aliveIds, formatClock, formatScore, instructionOf, pointsToWin } from './texts';

const nick = (id: number) => `P${id}`;
const alone = fruitView({ players: [fruitPlayer(1, 20), fruitPlayer(2, 50, 'OUT')] });

describe('남은 점수(R26)', () => {
  it('두 명 이상 살아 있으면 남은 점수가 없다', () => {
    expect(pointsToWin(fruitView())).toBeNull();
    expect(aliveIds(fruitView())).toEqual([1, 2]);
  });

  it('R26 혼자 남은 사람이 넘어야 할 점수', () => {
    expect(pointsToWin(alone)).toEqual({ playerId: 1, points: 31 });
    expect(pointsToWin(alone, 45)?.points).toBe(6);
    expect(pointsToWin(alone, 50)?.points).toBe(1);
    expect(pointsToWin(alone, 51)).toBeNull();
    expect(aliveIds(alone)).toEqual([1]);
  });

  it('견줄 사람 가운데 가장 높은 점수를 본다', () => {
    const game = fruitView({ participantIds: [1, 2, 3], players: [fruitPlayer(1, 10), fruitPlayer(2, 50, 'OUT'), fruitPlayer(3, 70, 'OUT')] });

    expect(pointsToWin(game)?.points).toBe(61);
  });

  it('기권한 사람은 견주지 않는다', () => {
    const withOut = fruitView({ participantIds: [1, 2, 3], players: [fruitPlayer(1, 10), fruitPlayer(2, 90, 'FORFEITED'), fruitPlayer(3, 30, 'OUT')] });
    const onlyForfeit = fruitView({ players: [fruitPlayer(1, 10), fruitPlayer(2, 90, 'FORFEITED')] });

    expect(pointsToWin(withOut)?.points).toBe(21);
    expect(pointsToWin(onlyForfeit)).toBeNull();
  });
});

describe('안내 문구(스펙 6.6)', () => {
  it('안내 문구 여섯 가지', () => {
    const over = fruitView({ status: 'GAME_OVER' });
    const twoAlive = fruitView({ participantIds: [1, 2, 3], players: [fruitPlayer(1, 5, 'OUT'), fruitPlayer(2), fruitPlayer(3)] });
    const both = (game: typeof over, meId: number, myScore: number | null = null) => [instructionOf(game, meId, nick, true, myScore), instructionOf(game, meId, nick, false, myScore)];

    expect(both(over, 1)).toEqual(['게임이 끝났어요.', '게임이 끝났어요.']);
    expect(both(alone, 1, 45)).toEqual(['혼자 남았어요. 6점만 더 얻으면 이겨요.', '6점만 더 얻으면 이겨요']);
    expect(both(alone, 1)).toEqual(['혼자 남았어요. 31점만 더 얻으면 이겨요.', '31점만 더 얻으면 이겨요']);
    expect(both(fruitView(), 1)).toEqual(['끌어서 자리를 정하고 놓으면 떨어져요.', '끌어서 놓으면 떨어져요']);
    expect(both(alone, 2)).toEqual(['P1님이 31점만 더 얻으면 이겨요.', 'P1님 31점 남음']);
    expect(both(alone, 9)).toEqual(['P1님이 31점만 더 얻으면 이겨요.', 'P1님 31점 남음']);
    expect(both(twoAlive, 1)).toEqual(['판이 가득 찼어요. 남은 사람의 판을 지켜보세요.', '남은 판을 지켜보세요']);
    expect(both(fruitView(), 9)).toEqual(['모두 과일을 쌓는 중…', '과일을 쌓는 중…']);
  });

  it('점수가 이미 넘었으면 보통 문구로 돌아간다', () => {
    expect(instructionOf(alone, 1, nick, true, 51)).toBe('끌어서 자리를 정하고 놓으면 떨어져요.');
  });

  it('남은 점수도 천 단위 쉼표로 쓴다', () => {
    const far = fruitView({ players: [fruitPlayer(1, 0), fruitPlayer(2, 1499, 'OUT')] });

    expect(instructionOf(far, 1, nick, true, null)).toBe('혼자 남았어요. 1,500점만 더 얻으면 이겨요.');
  });

  it('점수와 시계 글자', () => {
    expect(formatScore(0)).toBe('0');
    expect(formatScore(999)).toBe('999');
    expect(formatScore(1234)).toBe('1,234');
    expect(formatScore(1234567)).toBe('1,234,567');
    expect(formatClock(61_000)).toBe('1:01');
    expect(formatClock(600_000)).toBe('10:00');
    expect(formatClock(999)).toBe('0:01');
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(null)).toBe('0:00');
    expect(formatClock(-5)).toBe('0:00');
  });
});

describe('혼자 하기 안내(스펙 12장)', () => {
  it('혼자 하는 사람에게는 견줄 사람이 없어 "혼자 남았어요"나 남은 점수를 말하지 않는다', () => {
    const solo = soloView({ players: [fruitPlayer(1, 300)] });

    expect(pointsToWin(solo)).toBeNull();
    expect(instructionOf(solo, 1, nick, true, 300)).toBe('끌어서 자리를 정하고 놓으면 떨어져요.');
    expect(instructionOf(solo, 1, nick, false, 300)).toBe('끌어서 놓으면 떨어져요');
  });

  it('혼자 하는 게임을 지켜보는 사람에게는 누가 혼자 하는지 알린다', () => {
    const solo = soloView({ viewerId: 9 });

    expect(instructionOf(solo, 9, nick, true, null)).toBe('P1님이 혼자 과일을 쌓는 중이에요.');
    expect(instructionOf(solo, 9, nick, false, null)).toBe('P1님 혼자 하는 중');
  });

  it('끝나면 대결과 같이 게임이 끝났어요', () => {
    expect(instructionOf(soloView({ status: 'GAME_OVER' }), 1, nick, true, 0)).toBe('게임이 끝났어요.');
  });
});
