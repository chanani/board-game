import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
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

    expect(await screen.findByText('2승 0무 1패')).toBeInTheDocument();
    expect(screen.getByText('승률').nextElementSibling).toHaveTextContent('66.7%');
    expect(await screen.findByText('밥')).toBeInTheDocument();
    expect(screen.getByText('1점 20점')).toBeInTheDocument();
    expect(screen.queryByText('승 패')).not.toBeInTheDocument();
  });

  it('단판 규칙이라 라운드 통계 행과 토큰 표시는 보여주지 않는다', async () => {
    renderPage();
    await screen.findByText('2승 0무 1패');

    expect(screen.queryByText('라운드')).not.toBeInTheDocument();
    expect(screen.queryByText('라운드 승률')).not.toBeInTheDocument();
    expect(screen.getByText('평균 점수')).toBeInTheDocument();
    expect(await screen.findByText('밥')).toBeInTheDocument();
    expect(screen.queryByText(/토큰/)).not.toBeInTheDocument();
  });

  it('순위표 탭으로 바꿀 수 있다', async () => {
    renderPage();
    await screen.findByText('2승 0무 1패');

    await userEvent.click(screen.getByRole('button', { name: '순위표' }));

    expect(await screen.findByText(/6전 5승/)).toBeInTheDocument();
  });

  const statsOf = (memberId: number, nickname: string, winRate: number | null = 0.5) => ({
    memberId,
    nickname,
    stats: [{
      gameType: 'PAPER_SAFARI' as const, gameTypeName: '페이퍼 사파리', matches: 2, wins: 1, draws: 0, losses: 1,
      winRate, rounds: 2, roundWins: 1, roundDraws: 0, roundLosses: 1, roundWinRate: 0.5, averageRoundScore: 10,
    }],
  });

  function renderAt(path: string) {
    return render(
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Link to="/records/3">다음 회원</Link>
          <Routes>
            <Route path="/records" element={<RecordsPage />} />
            <Route path="/records/:memberId" element={<RecordsPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    );
  }

  it('다른 회원 경로에서는 그 회원의 전적을 불러온다', async () => {
    const member = vi.spyOn(recordsApi, 'member').mockResolvedValue(statsOf(2, '밥'));

    renderAt('/records/2');

    expect(await screen.findByRole('heading', { level: 1, name: /님의 전적/ })).toBeInTheDocument();
    expect(member).toHaveBeenCalledWith(2);
    expect(recordsApi.me).not.toHaveBeenCalled();
  });

  it('회원 주소가 바뀌면 다시 불러오고 이전 회원 정보를 지운다', async () => {
    const member = vi.spyOn(recordsApi, 'member').mockImplementation(async (id) => statsOf(id, id === 2 ? '밥' : '캐롤'));

    renderAt('/records/2');
    expect(await screen.findByRole('heading', { level: 1, name: '밥님의 전적' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: '다음 회원' }));

    expect(await screen.findByRole('heading', { level: 1, name: '캐롤님의 전적' })).toBeInTheDocument();
    expect(member).toHaveBeenCalledWith(3);
    expect(screen.queryByText('밥님의 전적')).not.toBeInTheDocument();
  });

  it('이전 회원의 늦은 응답은 무시한다', async () => {
    let resolveFirst: (value: ReturnType<typeof statsOf>) => void = () => {};
    vi.spyOn(recordsApi, 'member').mockImplementation((id) => id === 2
      ? new Promise((resolve) => { resolveFirst = resolve; })
      : Promise.resolve(statsOf(3, '캐롤')));

    renderAt('/records/2');
    await userEvent.click(screen.getByRole('link', { name: '다음 회원' }));
    expect(await screen.findByRole('heading', { level: 1, name: '캐롤님의 전적' })).toBeInTheDocument();
    resolveFirst(statsOf(2, '밥'));

    await waitFor(() => expect(screen.queryByText('밥님의 전적')).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { level: 1, name: '캐롤님의 전적' })).toBeInTheDocument();
  });

  it('잘못된 회원 주소는 조회하지 않는다', () => {
    const member = vi.spyOn(recordsApi, 'member');

    renderAt('/records/abc');

    expect(screen.getByText('잘못된 회원 주소예요.')).toBeInTheDocument();
    expect(member).not.toHaveBeenCalled();
  });

  it('최근 경기에는 본인을 제외한 상대만 보인다', async () => {
    renderPage();
    const list = (await screen.findByText('밥')).closest('ul') as HTMLElement;

    expect(within(list).queryByText('앨리스')).not.toBeInTheDocument();
  });

  it('승률이 없으면 -로 보여준다', async () => {
    vi.spyOn(recordsApi, 'me').mockResolvedValue(statsOf(1, '앨리스', null));

    renderPage();

    expect((await screen.findByText('승률')).nextElementSibling).toHaveTextContent('-');
  });
});
