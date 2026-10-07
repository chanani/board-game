import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { RecentMatch } from '../api/types';
import { RecentMatches } from './RecentMatches';

vi.mock('../games/registry', () => ({
  findGame: (type: string) => (type === 'OLD_MAID' ? { roundScoreText: (score: number) => `${score}등` } : undefined),
}));

const match = (gameType: RecentMatch['gameType'], score: number): RecentMatch => ({
  matchId: score, gameType, startedAt: '2026-10-07T10:00:00Z', endedAt: '2026-10-07T10:05:00Z', result: 'LOSE', tokens: score,
  players: [{ memberId: 1, nickname: '앨리스', result: 'LOSE', tokens: score }, { memberId: 2, nickname: '밥', result: 'WIN', tokens: 1 }],
  rounds: [{ roundNumber: 1, result: 'LOSE', score }],
});

describe('RecentMatches', () => {
  it('라운드 점수 글자는 게임이 정하고 없으면 점으로 쓴다', () => {
    render(<MemoryRouter><RecentMatches matches={[match('OLD_MAID', 2), match('UNO', 47)]} ownerId={1} /></MemoryRouter>);

    expect(screen.getByText('2등')).toBeInTheDocument();
    expect(screen.getByText('47점')).toBeInTheDocument();
  });
});
