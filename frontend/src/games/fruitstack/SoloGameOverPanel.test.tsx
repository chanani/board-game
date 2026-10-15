import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { FruitStackEndReason, Room } from '../../api/types';
import { FruitStackGameOverPanel } from './FruitStackGameOverPanel';
import { soloView } from './fruitStackFixtures';
import type { SoloBest } from './useSoloBest';

const room: Room = {
  code: 'ABCDEF', name: '방', gameType: 'FRUIT_STACK', gameTypeName: '수박게임', status: 'WAITING', hostId: 1, maxPlayers: 5,
  locked: false, spectators: [{ id: 9, nickname: 'P9' }], theme: 'WOOD',
  members: [{ id: 1, nickname: 'P1', host: true, connected: true, offlineSeconds: 0, ready: false }],
};
const nick = (id: number) => `P${id}`;

function open(options: { score?: number; reason?: FruitStackEndReason; best?: SoloBest | null; meId?: number } = {}) {
  const { score = 320, reason = 'ALL_OUT', meId = 1 } = options;
  const best = options.best === undefined ? { previous: 200, fresh: true } : options.best;
  const game = soloView({
    status: 'GAME_OVER', deadline: null, winnerId: 1, viewerId: meId,
    result: { reason, standings: [{ playerId: 1, score, outcome: 'WIN', rank: 1, state: reason === 'FORFEIT' ? 'FORFEITED' : 'OUT' }] },
  });
  const onClose = vi.fn();
  render(<FruitStackGameOverPanel game={game} room={room} meId={meId} nicknameOf={nick} onReady={vi.fn()} onClose={onClose} best={best} />);
  return { onClose };
}

const panel = async () => {
  await waitFor(() => expect(screen.getByTestId('solo-game-over')).toBeVisible());
  return screen.getByTestId('solo-game-over');
};

describe('혼자 하기 결과 창(스펙 12장)', () => {
  it('최고 점수를 넘으면 새 최고 점수를 크게 알리고 이번 점수와 최고 점수를 보인다', async () => {
    open({ score: 320, best: { previous: 200, fresh: true } });
    const shown = await panel();

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('새 최고 점수예요!');
    expect(screen.getByTestId('solo-score')).toHaveTextContent('이번 점수320점');
    expect(screen.getByTestId('solo-best-score')).toHaveTextContent('최고 점수320점');
    expect(screen.getByTestId('solo-best-score')).toHaveAttribute('data-new', 'true');
    expect(screen.getByTestId('solo-previous')).toHaveTextContent('이전 최고 200점');
    expect(shown).not.toHaveTextContent(/이겼어요|비겼어요|등/);
    expect(screen.queryByTestId('standing-row')).not.toBeInTheDocument();
  });

  it('최고 점수를 못 넘으면 판이 가득 찼다고 하고 최고 점수는 그대로 보인다', async () => {
    open({ score: 150, best: { previous: 200, fresh: true } });
    await panel();

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('판이 가득 찼어요!');
    expect(screen.getByTestId('solo-score')).toHaveTextContent('150점');
    expect(screen.getByTestId('solo-best-score')).toHaveTextContent('최고 점수200점');
    expect(screen.getByTestId('solo-best-score')).not.toHaveAttribute('data-new');
    expect(screen.getByTestId('solo-gap')).toHaveTextContent('최고 점수까지 50점 남았어요');
  });

  it('최고 점수와 같으면 새 최고 점수가 아니다', async () => {
    open({ score: 200, best: { previous: 200, fresh: true } });
    await panel();

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('판이 가득 찼어요!');
    expect(screen.getByTestId('solo-gap')).toHaveTextContent('최고 점수와 같아요');
  });

  it('처음 혼자 한 판이면 첫 기록이라고 알린다', async () => {
    open({ score: 90, best: { previous: null, fresh: true } });
    await panel();

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('첫 기록이에요!');
    expect(screen.getByTestId('solo-best-score')).toHaveTextContent('최고 점수90점');
    expect(screen.getByTestId('solo-best-score')).toHaveAttribute('data-new', 'true');
  });

  it('최고 점수를 불러오지 못했으면 이번 점수만 보인다', async () => {
    open({ score: 90, best: null });
    await panel();

    expect(screen.getByTestId('solo-score')).toHaveTextContent('90점');
    expect(screen.queryByTestId('solo-best-score')).not.toBeInTheDocument();
  });

  it('끝난 뒤에 불러온 최고 점수는 이번 판이 이미 들어 있어 새 기록인지 말하지 않는다', async () => {
    open({ score: 320, best: { previous: 320, fresh: false } });
    await panel();

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('판이 가득 찼어요!');
    expect(screen.getByTestId('solo-best-score')).toHaveTextContent('320점');
    expect(screen.queryByTestId('solo-gap')).not.toBeInTheDocument();
  });

  it('5분 동안 아무것도 오지 않아 끝났으면 그 이유를 알린다', async () => {
    open({ score: 150, reason: 'ABANDONED' });
    await panel();

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('게임이 끝났어요');
    expect(screen.getByTestId('end-reason')).toHaveTextContent('오래 움직임이 없어 지금 점수로 끝났어요');
  });

  it('지켜본 사람에게는 누가 몇 점으로 끝냈는지만 보인다', async () => {
    open({ meId: 9, score: 150 });
    await panel();

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('P1님의 판이 가득 찼어요!');
    expect(screen.getByTestId('solo-score')).toHaveTextContent('점수150점');
    expect(screen.queryByTestId('solo-best-score')).not.toBeInTheDocument();
  });

  it('방장은 대기실로 돌아가 다시 혼자 시작할 수 있다', async () => {
    const { onClose } = open();
    await panel();

    await userEvent.click(screen.getByRole('button', { name: '대기실로' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
