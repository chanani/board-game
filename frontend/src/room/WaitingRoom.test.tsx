import { render, screen } from '@testing-library/react';
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

function renderRoom() {
  render(<ToastProvider><WaitingRoom room={room} meId={1} receivedAt={0} now={0} onStart={vi.fn()} onForfeit={vi.fn()} onSeat={vi.fn()} /></ToastProvider>);
}

describe('WaitingRoom', () => {
  it('최대 인원만큼 의자를 놓고 빈자리를 보여준다', () => {
    renderRoom();

    expect(screen.getAllByTestId('chair')).toHaveLength(4);
    expect(screen.getAllByLabelText('빈자리')).toHaveLength(2);
    expect(screen.getByText('앨리스')).toBeInTheDocument();
  });

  it('60초 넘게 끊긴 사람은 내보내기 버튼이 있다', () => {
    renderRoom();

    expect(screen.getByRole('button', { name: '내보내기' })).toBeInTheDocument();
  });

  it('방장은 시작 버튼을 누를 수 있다', () => {
    renderRoom();

    expect(screen.getByRole('button', { name: '게임 시작' })).toBeEnabled();
  });

  it('규칙은 펼치지 않아도 항상 보인다', () => {
    const { container } = render(<ToastProvider><WaitingRoom room={room} meId={1} receivedAt={0} now={0} onStart={vi.fn()} onForfeit={vi.fn()} onSeat={vi.fn()} /></ToastProvider>);

    expect(container.querySelector('details')).toBeNull();
    expect(screen.getByText(/합이 가장 낮은 사람이 1승/)).toBeVisible();
  });

  it('관전자가 있으면 관전 중인 사람을 보여준다', () => {
    const watched = { ...room, spectators: [{ id: 3, nickname: '캐롤' }, { id: 4, nickname: '데이브' }] };
    render(<ToastProvider><WaitingRoom room={watched} meId={1} receivedAt={0} now={0} onStart={vi.fn()} onForfeit={vi.fn()} onSeat={vi.fn()} /></ToastProvider>);

    expect(screen.getByText('👀 관전 중: 캐롤, 데이브')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '자리에 앉기' })).not.toBeInTheDocument();
  });

  it('내가 관전자면 자리에 앉을 수 있고 시작 버튼은 없다', async () => {
    const onSeat = vi.fn();
    const watched = { ...room, spectators: [{ id: 3, nickname: '캐롤' }] };
    render(<ToastProvider><WaitingRoom room={watched} meId={3} receivedAt={0} now={0} onStart={vi.fn()} onForfeit={vi.fn()} onSeat={onSeat} /></ToastProvider>);

    await userEvent.click(screen.getByRole('button', { name: '자리에 앉기' }));

    expect(onSeat).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /게임 시작|2명 이상/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/방장이 게임을 시작하길/)).not.toBeInTheDocument();
  });

  it('정원이 찼으면 관전자도 자리에 앉기 버튼이 없다', () => {
    const full = { ...room, maxPlayers: 2, spectators: [{ id: 3, nickname: '캐롤' }] };
    render(<ToastProvider><WaitingRoom room={full} meId={3} receivedAt={0} now={0} onStart={vi.fn()} onForfeit={vi.fn()} onSeat={vi.fn()} /></ToastProvider>);

    expect(screen.queryByRole('button', { name: '자리에 앉기' })).not.toBeInTheDocument();
  });
});
