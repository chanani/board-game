import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { FruitStackEndReason, FruitStackStanding, Room } from '../../api/types';
import { FruitStackGameOverPanel } from './FruitStackGameOverPanel';
import { fruitView } from './fruitStackFixtures';

const room: Room = {
  code: 'ABCDEF', name: '방', gameType: 'FRUIT_STACK', gameTypeName: '수박게임', status: 'WAITING', hostId: 1, maxPlayers: 5,
  locked: false, spectators: [], theme: 'WOOD',
  members: [
    { id: 1, nickname: 'P1', host: true, connected: true, offlineSeconds: 0, ready: false },
    { id: 2, nickname: 'P2', host: false, connected: true, offlineSeconds: 0, ready: false },
  ],
};
const nick = (id: number) => `P${id}`;
const WON: FruitStackStanding[] = [
  { playerId: 1, score: 320, outcome: 'WIN', rank: 1, state: 'OUT' },
  { playerId: 2, score: 100, outcome: 'LOSE', rank: 2, state: 'OUT' },
];

function open(options: { reason?: FruitStackEndReason; standings?: FruitStackStanding[]; winnerId?: number | null; meId?: number } = {}) {
  const { reason = 'ALL_OUT', standings = WON, meId = 1 } = options;
  const winnerId = options.winnerId === undefined ? 1 : options.winnerId;
  const onReady = vi.fn();
  const onClose = vi.fn();
  const game = fruitView({ status: 'GAME_OVER', deadline: null, winnerId, result: { reason, standings } });
  const view = render(<FruitStackGameOverPanel game={game} room={room} meId={meId} nicknameOf={nick} onReady={onReady} onClose={onClose} />);
  return { onReady, onClose, ...view };
}

const rows = async () => {
  await waitFor(() => expect(screen.getByTestId('fruit-game-over')).toBeVisible());
  return screen.getAllByTestId('standing-row');
};

describe('FruitStackGameOverPanel', () => {
  it('내가 이기면', async () => {
    open();
    const [first, second] = await rows();

    expect(screen.getByRole('heading', { name: '내가 이겼어요!' })).toBeVisible();
    expect(screen.queryByTestId('end-reason')).not.toBeInTheDocument();
    expect(await rows()).toHaveLength(2);
    expect(first).toHaveTextContent('1등');
    expect(first).toHaveTextContent('320점');
    expect(within(first).getByText('승리')).toBeInTheDocument();
    expect(first).toHaveAttribute('data-me', 'true');
    expect(second).not.toHaveAttribute('data-me');
    expect(within(second).queryByText('승리')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '대기실로' })).toBeVisible();
  });

  it('남이 이기면', async () => {
    const { onReady } = open({ meId: 2 });
    await rows();

    expect(screen.getByRole('heading', { name: 'P1님이 이겼어요!' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: '다음 게임 준비' }));
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('비기면', async () => {
    open({ winnerId: null, standings: [
      { playerId: 1, score: 40, outcome: 'DRAW', rank: 1, state: 'OUT' },
      { playerId: 2, score: 40, outcome: 'DRAW', rank: 1, state: 'OUT' },
    ] });
    await rows();

    expect(screen.getByRole('heading', { name: '비겼어요!' })).toBeVisible();
    expect(screen.getAllByText('무승부')).toHaveLength(2);
  });

  it('이유 줄 세 가지', async () => {
    const lines: [FruitStackEndReason, string][] = [
      ['TIME_UP', '10분이 지나 지금 점수로 끝났어요'],
      ['FORFEIT', '상대가 나가서 게임이 끝났어요'],
      ['DECIDED', '마지막 한 사람의 점수가 가장 높아 바로 끝났어요'],
    ];
    for (const [reason, text] of lines) {
      const { unmount } = open({ reason });
      await waitFor(() => expect(screen.getByTestId('end-reason')).toHaveTextContent(text));
      unmount();
    }
  });

  it('기권한 사람은 흐리게 "기권"', async () => {
    open({ standings: [...WON, { playerId: 3, score: 900, outcome: 'LOSE', rank: 3, state: 'FORFEITED' }] });
    const last = (await rows())[2];

    expect(last).toHaveTextContent('3등');
    expect(within(last).getByText('기권')).toBeInTheDocument();
    expect(last.className).toContain('opacity-60');
  });

  it('천 단위 쉼표', async () => {
    open({ standings: [{ ...WON[0], score: 12345 }, WON[1]] });

    expect((await rows())[0]).toHaveTextContent('12,345점');
  });
});
