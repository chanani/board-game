import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Room } from '../api/types';
import { ToastProvider } from '../components/Toast';
import { WaitingRoom } from './WaitingRoom';

const room: Room = {
  code: 'ABC234', name: '방', gameType: 'PAPER_SAFARI', gameTypeName: '페이퍼 사파리', status: 'WAITING', hostId: 1, maxPlayers: 4, locked: false, spectators: [],
  members: [
    { id: 1, nickname: '앨리스', host: true, connected: true, offlineSeconds: 0, ready: false },
    { id: 2, nickname: '밥', host: false, connected: false, offlineSeconds: 70, ready: false },
  ],
};

type Overrides = { room?: Room; meId?: number; onSeat?: () => void; onReady?: (ready: boolean) => unknown; onStart?: () => void; onForfeit?: (memberId: number) => void; onKick?: (memberId: number) => unknown };

function renderRoom({ room: shown = room, meId = 1, onSeat = vi.fn(), onReady = vi.fn(), onStart = vi.fn(), onForfeit = vi.fn(), onKick = vi.fn() }: Overrides = {}) {
  return render(
    <ToastProvider>
      <WaitingRoom room={shown} meId={meId} receivedAt={0} now={0} onStart={onStart} onReady={onReady} onForfeit={onForfeit} onKick={onKick} onSeat={onSeat}
        chat={{ messages: [{ id: 1, memberId: 2, nickname: '밥', text: '준비할게요', sentAt: '2026-10-06T00:00:00Z' }], onSend: vi.fn(() => true) }} />
    </ToastProvider>,
  );
}

const readyRoom: Room = { ...room, members: [room.members[0], { ...room.members[1], ready: true }] };

describe('WaitingRoom', () => {
  it('최대 인원만큼 의자를 놓고 빈자리를 보여준다', () => {
    renderRoom();

    expect(screen.getAllByTestId('chair')).toHaveLength(4);
    expect(screen.getAllByLabelText('빈자리')).toHaveLength(2);
    expect(screen.getByText('앨리스')).toBeInTheDocument();
  });

  it('의자마다 방장·준비 상태 칩을 단다', () => {
    renderRoom({ room: { ...room, maxPlayers: 3, members: [...room.members, { id: 5, nickname: '에린', host: false, connected: true, offlineSeconds: 0, ready: true }] } });

    expect(screen.getByText('👑 방장')).toBeInTheDocument();
    expect(screen.getByText('준비 전')).toBeInTheDocument();
    expect(screen.getByText('✔ 준비 완료')).toBeInTheDocument();
  });

  it('60초 넘게 끊긴 사람은 방장이 아니어도 내보내기 버튼이 있다', async () => {
    const onForfeit = vi.fn();
    const erin = { id: 5, nickname: '에린', host: false, connected: true, offlineSeconds: 0, ready: false };
    renderRoom({ room: { ...room, members: [...room.members, erin] }, meId: 5, onForfeit });

    await userEvent.click(screen.getByRole('button', { name: '내보내기' }));

    expect(onForfeit).toHaveBeenCalledWith(2);
  });

  it('방장은 대기 중에 다른 참가자를 확인 창을 거쳐 내보낼 수 있다', async () => {
    const onKick = vi.fn();
    const erin = { id: 5, nickname: '에린', host: false, connected: true, offlineSeconds: 0, ready: false };
    renderRoom({ room: { ...room, members: [...room.members, erin] }, onKick });

    const chairs = screen.getAllByTestId('chair');
    expect(within(chairs[0]).queryByRole('button', { name: '내보내기' })).not.toBeInTheDocument();
    await userEvent.click(within(chairs[2]).getByRole('button', { name: '내보내기' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('에린님을 내보낼까요?')).toBeVisible();
    await userEvent.click(within(dialog).getByRole('button', { name: '취소' }));
    expect(onKick).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await userEvent.click(within(chairs[2]).getByRole('button', { name: '내보내기' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '내보내기' }));
    expect(onKick).toHaveBeenCalledWith(5);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('방장이 아니면 연결된 참가자를 내보낼 수 없다', () => {
    renderRoom({ room: { ...room, members: [room.members[0], { ...room.members[1], connected: true, offlineSeconds: 0 }] }, meId: 2 });

    expect(screen.queryByRole('button', { name: '내보내기' })).not.toBeInTheDocument();
  });

  it('방장은 모두 준비하면 시작 버튼을 누를 수 있다', async () => {
    const onStart = vi.fn();
    renderRoom({ room: readyRoom, onStart });

    await userEvent.click(screen.getByRole('button', { name: '게임 시작' }));

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(screen.getByText('코드 ABC234 📋')).toBeInTheDocument();
  });

  it('준비하지 않은 참가자가 있으면 방장의 시작 버튼이 꺼지고 이유를 알려 준다', () => {
    renderRoom();

    expect(screen.getByRole('button', { name: '게임 시작' })).toBeDisabled();
    expect(screen.getByText('모두 준비하면 시작할 수 있어요')).toBeVisible();
  });

  it('혼자면 2명 이상 모여야 한다고 알려 준다', () => {
    renderRoom({ room: { ...room, members: [room.members[0]] } });

    expect(screen.getByRole('button', { name: '게임 시작' })).toBeDisabled();
    expect(screen.getByText('2명 이상 모여야 해요')).toBeVisible();
  });

  it('참가자는 준비하기로 준비하고 준비 취소로 되돌린다', async () => {
    const onReady = vi.fn();
    const view = renderRoom({ meId: 2, onReady });

    await userEvent.click(screen.getByRole('button', { name: '준비하기' }));
    expect(onReady).toHaveBeenCalledWith(true);
    expect(screen.queryByRole('button', { name: '게임 시작' })).not.toBeInTheDocument();

    view.unmount();
    renderRoom({ room: readyRoom, meId: 2, onReady });
    await userEvent.click(screen.getByRole('button', { name: '준비 취소' }));
    expect(onReady).toHaveBeenLastCalledWith(false);
  });

  it('옆에 채팅과 규칙이 항상 보인다', () => {
    const { container } = renderRoom();

    expect(screen.getByRole('textbox', { name: '채팅 입력' })).toBeInTheDocument();
    expect(screen.getByText('준비할게요')).toBeInTheDocument();
    expect(container.querySelector('details')).toBeNull();
    expect(screen.getByText(/합이 가장 낮은 사람이 1승/)).toBeVisible();
  });

  it('관전자가 있으면 관전 중인 사람을 보여준다', () => {
    renderRoom({ room: { ...room, spectators: [{ id: 3, nickname: '캐롤' }, { id: 4, nickname: '데이브' }] } });

    expect(screen.getByText('👀 관전 중: 캐롤, 데이브')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '자리에 앉기' })).not.toBeInTheDocument();
  });

  it('대기 중에 내가 관전자면 자리 안내와 자리에 앉기가 있고 시작·준비 버튼은 없다', async () => {
    const onSeat = vi.fn();
    renderRoom({ room: { ...room, spectators: [{ id: 3, nickname: '캐롤' }] }, meId: 3, onSeat });

    await userEvent.click(screen.getByRole('button', { name: '자리에 앉기' }));

    expect(onSeat).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/자리가 나면 앉을 수 있어요/)).toBeInTheDocument();
    expect(screen.queryByText(/게임이 끝나면 자동으로 참가해요/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /게임 시작|준비하기/ })).not.toBeInTheDocument();
  });

  it('정원이 찼으면 관전자도 자리에 앉기 버튼이 없다', () => {
    renderRoom({ room: { ...room, maxPlayers: 2, spectators: [{ id: 3, nickname: '캐롤' }] }, meId: 3 });

    expect(screen.queryByRole('button', { name: '자리에 앉기' })).not.toBeInTheDocument();
    expect(screen.getByText(/자리가 나면 앉을 수 있어요/)).toBeInTheDocument();
    expect(screen.queryByText(/게임이 끝나면 자동으로 참가해요/)).not.toBeInTheDocument();
  });

  it('준비 요청이 끝날 때까지 준비 버튼을 다시 누를 수 없다', async () => {
    let finish: () => void = () => {};
    const onReady = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    renderRoom({ meId: 2, onReady });

    await userEvent.click(screen.getByRole('button', { name: '준비하기' }));
    expect(screen.getByRole('button', { name: '준비하기' })).toBeDisabled();

    await act(async () => finish());
    expect(screen.getByRole('button', { name: '준비하기' })).toBeEnabled();
  });
});
