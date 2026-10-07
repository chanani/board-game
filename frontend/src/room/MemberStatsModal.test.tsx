import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/http';
import { recordsApi } from '../api/records';
import type { GameStat, MemberStats } from '../api/types';
import { MemberStatsModal, statLines } from './MemberStatsModal';

vi.mock('../api/records', () => ({ recordsApi: { member: vi.fn() } }));

const stat = (gameType: GameStat['gameType'], matches: number, wins: number): GameStat => ({
  gameType, gameTypeName: gameType, matches, wins, draws: 0, losses: matches - wins, winRate: matches === 0 ? null : wins / matches,
  rounds: 0, roundWins: 0, roundDraws: 0, roundLosses: 0, roundWinRate: null, averageRoundScore: null,
});
const bob = (stats: GameStat[]): MemberStats => ({ memberId: 2, nickname: '밥', avatar: 'FOX', stats });
const target = { id: 2, nickname: '밥', avatar: 'FOX' };

// 중괄호로 감싸 아무것도 돌려주지 않는다(beforeEach가 함수를 돌려주면 vitest가 테스트 뒤 정리 함수로 불러 버린다).
beforeEach(() => {
  vi.mocked(recordsApi.member).mockReset();
});

function renderModal(onClose = vi.fn()) {
  render(<MemberStatsModal target={target} onClose={onClose} />);
  return onClose;
}



describe('statLines', () => {
  it('등록된 게임 순서대로 판 수·승 수·승률을 만들고 전체 합계를 더한다', () => {
    const { games, total } = statLines([stat('UNO', 6, 3), stat('PAPER_SAFARI', 4, 3)]);
    expect(games.map((line) => [line.name, line.matches, line.wins, line.winRate])).toEqual([
      ['페이퍼 사파리', 4, 3, 0.75], ['우노', 6, 3, 0.5], ['도둑잡기', 0, 0, null],
    ]);
    expect(total).toMatchObject({ name: '전체', matches: 10, wins: 6, winRate: 0.6 });
  });
});

describe('MemberStatsModal', () => {
  it('프로필 그림·닉네임과 게임별 판 수·승 수·승률, 전체 합계를 보여 준다', async () => {
    vi.mocked(recordsApi.member).mockResolvedValue(bob([stat('PAPER_SAFARI', 4, 3), stat('UNO', 6, 3)]));
    renderModal();

    const dialog = screen.getByRole('dialog', { name: '밥님 전적' });
    expect(within(dialog).getByRole('heading', { name: '밥' })).toBeInTheDocument();
    expect(within(dialog).getByTestId('avatar')).toHaveAttribute('data-avatar', 'FOX');
    expect(await within(dialog).findByTestId('stat-PAPER_SAFARI')).toHaveTextContent('페이퍼 사파리4판3승75.0%');
    expect(within(dialog).getByTestId('stat-UNO')).toHaveTextContent('우노6판3승50.0%');
    expect(within(dialog).getByTestId('stat-TOTAL')).toHaveTextContent('전체10판6승60.0%');
    expect(recordsApi.member).toHaveBeenCalledWith(2);
  });

  it('한 판도 없으면 아직 기록이 없어요', async () => {
    vi.mocked(recordsApi.member).mockResolvedValue(bob([stat('PAPER_SAFARI', 0, 0), stat('UNO', 0, 0)]));
    renderModal();

    expect(await screen.findByText('아직 기록이 없어요')).toBeInTheDocument();
    expect(screen.queryByTestId('stat-TOTAL')).not.toBeInTheDocument();
  });

  it('불러오지 못하면 서버 안내 문구를 보여 준다', async () => {
    vi.mocked(recordsApi.member).mockImplementation(() => Promise.reject(new ApiError(404, 'MEMBER_NOT_FOUND', '회원을 찾을 수 없습니다.')));
    renderModal();

    expect(await screen.findByRole('alert')).toHaveTextContent('회원을 찾을 수 없습니다.');
  });

  it('배경을 누르거나 Esc를 누르거나 닫기 버튼(SVG X)을 누르면 닫힌다', async () => {
    vi.mocked(recordsApi.member).mockResolvedValue(bob([]));
    const onClose = renderModal();

    await userEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);

    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);

    const close = screen.getByRole('button', { name: '닫기' });
    expect(close.querySelector('svg')).not.toBeNull();
    await userEvent.click(close);
    expect(onClose).toHaveBeenCalledTimes(3);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
  });

  it('도둑잡기 전적 줄을 보인다', async () => {
    vi.mocked(recordsApi.member).mockResolvedValue(bob([stat('PAPER_SAFARI', 4, 3), stat('UNO', 6, 3), stat('OLD_MAID', 5, 1)]));
    renderModal();

    const dialog = screen.getByRole('dialog', { name: '밥님 전적' });
    expect(await within(dialog).findByTestId('stat-OLD_MAID')).toHaveTextContent('도둑잡기5판1승20.0%');
    expect(within(dialog).getByTestId('stat-TOTAL')).toHaveTextContent('전체15판7승46.7%');
  });
});
