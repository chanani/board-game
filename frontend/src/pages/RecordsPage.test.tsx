import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recordsApi } from '../api/records';
import { ToastProvider } from '../components/Toast';
import { RecordsPage } from './RecordsPage';

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({ member: { id: 1, loginId: 'alice01', nickname: '앨리스' } }),
}));

describe('RecordsPage', () => {
  beforeEach(() => {
    vi.spyOn(recordsApi, 'me').mockResolvedValue({
      memberId: 1,
      nickname: '앨리스',
      stats: [{
        gameType: 'PAPER_SAFARI', gameTypeName: '페이퍼 사파리', matches: 3, wins: 2, draws: 0, losses: 1,
        winRate: 2 / 3, rounds: 3, roundWins: 2, roundDraws: 0, roundLosses: 1, roundWinRate: 2 / 3, averageRoundScore: 14,
      }],
    });
    vi.spyOn(recordsApi, 'matches').mockResolvedValue([{
      matchId: 9, gameType: 'PAPER_SAFARI', startedAt: '2026-10-05T10:00:00Z', endedAt: '2026-10-05T10:20:00Z',
      result: 'WIN', tokens: 3,
      players: [{ memberId: 1, nickname: '앨리스', result: 'WIN', tokens: 3 }, { memberId: 2, nickname: '밥', result: 'LOSE', tokens: 1 }],
      rounds: [{ roundNumber: 1, result: 'WIN', score: 1 }, { roundNumber: 2, result: 'LOSE', score: 20 }],
    }]);
    vi.spyOn(recordsApi, 'rankings').mockResolvedValue([
      { rank: 1, memberId: 2, nickname: '밥', matches: 6, wins: 5, draws: 0, losses: 1, winRate: 5 / 6 },
    ]);
  });

  function renderPage() {
    return render(
      <ToastProvider>
        <MemoryRouter initialEntries={['/records']}>
          <Routes>
            <Route path="/records" element={<RecordsPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    );
  }

  it('내 통계와 최근 경기를 보여준다', async () => {
    renderPage();

    expect(await screen.findByText(/3전 2승 0무 1패/)).toBeInTheDocument();
    expect(screen.getByText('승률 66.7%')).toBeInTheDocument();
    expect(await screen.findByText('밥')).toBeInTheDocument();
    expect(screen.getByText('승 패')).toBeInTheDocument();
  });

  it('순위표 탭으로 바꿀 수 있다', async () => {
    renderPage();
    await screen.findByText(/3전 2승 0무 1패/);

    await userEvent.click(screen.getByRole('button', { name: '순위표' }));

    expect(await screen.findByText(/6전 5승/)).toBeInTheDocument();
  });
});
