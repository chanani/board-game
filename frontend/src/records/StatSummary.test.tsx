import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { GameStat } from '../api/types';
import { StatSummary } from './StatSummary';

const stat = (gameType: GameStat['gameType'], bestSoloScore?: number | null): GameStat => ({
  gameType, gameTypeName: gameType === 'FRUIT_STACK' ? '수박게임' : '우노', matches: 2, wins: 1, draws: 0, losses: 1, winRate: 0.5,
  rounds: 2, roundWins: 1, roundDraws: 0, roundLosses: 1, roundWinRate: 0.5, averageRoundScore: 40, bestSoloScore,
});

describe('StatSummary', () => {
  it('수박게임은 승률·평균 점수와 따로 혼자 최고 점수를 보여 준다', () => {
    render(<StatSummary stat={stat('FRUIT_STACK', 12345)} />);

    expect(screen.getByText('혼자 최고 점수').nextSibling).toHaveTextContent('12,345점');
  });

  it('수박게임을 혼자 한 적이 없으면 혼자 최고 점수는 -', () => {
    render(<StatSummary stat={stat('FRUIT_STACK', null)} />);

    expect(screen.getByText('혼자 최고 점수').nextSibling).toHaveTextContent('-');
  });

  it('혼자 할 수 없는 게임에는 혼자 최고 점수 줄이 없다', () => {
    render(<StatSummary stat={stat('UNO')} />);

    expect(screen.queryByText('혼자 최고 점수')).not.toBeInTheDocument();
  });
});
