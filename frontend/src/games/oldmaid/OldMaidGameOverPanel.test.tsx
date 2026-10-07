import { render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OldMaidResult, Room } from '../../api/types';
import { OldMaidGameOverPanel } from './OldMaidGameOverPanel';
import { oldMaidView } from './oldMaidFixtures';

const room: Room = {
  code: 'OLDMAD', name: '방', gameType: 'OLD_MAID', gameTypeName: '도둑잡기', status: 'WAITING', hostId: 1, maxPlayers: 6,
  locked: false, spectators: [], theme: 'WOOD',
  members: [
    { id: 1, nickname: '앨리스', host: true, connected: true, offlineSeconds: 0, ready: false },
    { id: 2, nickname: '밥', host: false, connected: true, offlineSeconds: 0, ready: true },
    { id: 3, nickname: '캐롤', host: false, connected: true, offlineSeconds: 0, ready: false },
  ],
};
const nicknameOf = (id: number) => room.members.find((member) => member.id === id)?.nickname ?? '떠난 플레이어';
const normal: OldMaidResult = { reason: 'NORMAL', thiefId: 3, ranking: [
  { playerId: 2, rank: 1, placement: 'FINISHED' },
  { playerId: 1, rank: 2, placement: 'FINISHED' },
  { playerId: 3, rank: 3, placement: 'THIEF' },
] };
const over = (result: OldMaidResult) => oldMaidView({ status: 'GAME_OVER', currentPlayerId: null, targetId: null, peek: null, result, winnerId: result.ranking[0].playerId });

function panel(result: OldMaidResult, meId = 1) {
  return <OldMaidGameOverPanel game={over(result)} room={room} meId={meId} nicknameOf={nicknameOf} onReady={vi.fn()} onClose={vi.fn()} />;
}

describe('OldMaidGameOverPanel', () => {
  it('1등 머리말과 도둑 줄, 등수 순 표에서 도둑을 강조한다', async () => {
    render(panel(normal));

    await waitFor(() => expect(screen.getByRole('heading', { name: '밥님이 1등이에요!' })).toBeVisible());
    expect(screen.getByTestId('thief-line')).toHaveTextContent('도둑은 캐롤님이에요');
    const rows = screen.getAllByTestId('rank-row');
    expect(rows.map((row) => row.getAttribute('data-player'))).toEqual(['2', '1', '3']);
    expect(rows[2]).toHaveAttribute('data-placement', 'THIEF');
    expect(within(rows[2]).getByText('도둑')).toBeInTheDocument();
    expect(within(rows[0]).getByText('1등')).toBeInTheDocument();
  });

  it('내가 1등·내가 도둑일 때 문구', async () => {
    const { unmount } = render(panel(normal, 2));
    await waitFor(() => expect(screen.getByRole('heading', { name: '내가 1등이에요!' })).toBeVisible());
    unmount();

    render(panel(normal, 3));
    await waitFor(() => expect(screen.getByTestId('thief-line')).toHaveTextContent('내가 도둑이에요'));
  });

  it('모두 나가서 끝나면 남은 승자 문구, 기권자는 흐리게 기권', async () => {
    const forfeit: OldMaidResult = { reason: 'FORFEIT', thiefId: null, ranking: [
      { playerId: 1, rank: 1, placement: 'LAST_STANDING' },
      { playerId: 2, rank: 2, placement: 'FORFEITED' },
    ] };
    render(panel(forfeit));

    await waitFor(() => expect(screen.getByText('모두 나가서 게임이 끝났어요')).toBeVisible());
    expect(screen.queryByTestId('thief-line')).not.toBeInTheDocument();
    expect(within(screen.getAllByTestId('rank-row')[1]).getByText('기권')).toBeInTheDocument();
  });

  it('손님은 다음 게임 준비, 방장은 대기실로', async () => {
    const { unmount } = render(panel(normal, 2));
    await waitFor(() => expect(screen.getByRole('button', { name: '다음 게임 준비' })).toBeVisible());
    unmount();

    render(panel(normal, 1));
    await waitFor(() => expect(screen.getByRole('button', { name: '대기실로' })).toBeVisible());
    expect(screen.getByTestId('ready-chips')).toBeInTheDocument();
  });
});
