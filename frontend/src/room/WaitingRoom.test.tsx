import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Room } from '../api/types';
import { ToastProvider } from '../components/Toast';
import { WaitingRoom } from './WaitingRoom';

const room: Room = {
  code: 'ABC234', name: '방', gameType: 'PAPER_SAFARI', gameTypeName: '페이퍼 사파리', status: 'WAITING', hostId: 1, maxPlayers: 4,
  members: [
    { id: 1, nickname: '앨리스', host: true, connected: true, offlineSeconds: 0 },
    { id: 2, nickname: '밥', host: false, connected: false, offlineSeconds: 70 },
  ],
};

function renderRoom() {
  render(<ToastProvider><WaitingRoom room={room} meId={1} receivedAt={0} now={0} onStart={vi.fn()} onForfeit={vi.fn()} /></ToastProvider>);
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
});
