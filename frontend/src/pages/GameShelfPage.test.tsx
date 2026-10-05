import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/Toast';
import { GameShelfPage } from './GameShelfPage';

const list = vi.fn();
const mine = vi.fn();
vi.mock('../api/games', () => ({ gamesApi: { list: () => list() } }));
vi.mock('../api/rooms', () => ({ roomsApi: { mine: () => mine() } }));

function renderShelf() {
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<GameShelfPage />} />
          <Route path="/games/:slug" element={<p>로비 화면</p>} />
          <Route path="/rooms/:code" element={<p>방 화면</p>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

beforeEach(() => {
  list.mockReset();
  mine.mockReset();
  mine.mockResolvedValue(undefined);
});

describe('GameShelfPage', () => {
  it('게임 상자와 대기·플레이 인원을 보여준다', async () => {
    list.mockResolvedValue([{ gameType: 'PAPER_SAFARI', name: '페이퍼 사파리', minPlayers: 2, maxPlayers: 5, waitingPlayers: 3, playingPlayers: 6 }]);
    renderShelf();

    expect(await screen.findByLabelText('대기 3명')).toBeInTheDocument();
    expect(screen.getByLabelText('플레이 6명')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '준비 중인 게임' })).toBeDisabled();
  });

  it('인원을 못 불러오면 –로 보여준다', async () => {
    list.mockRejectedValue(new Error('down'));
    renderShelf();

    expect(await screen.findByLabelText('대기 인원 알 수 없음')).toHaveTextContent('–');
  });

  it('게임 상자를 누르면 그 게임 로비로 간다', async () => {
    list.mockResolvedValue([]);
    renderShelf();

    await userEvent.click(screen.getByRole('button', { name: '페이퍼 사파리 열기' }));

    expect(await screen.findByText('로비 화면')).toBeInTheDocument();
  });

  it('이미 방에 있으면 그 방으로 간다', async () => {
    list.mockResolvedValue([]);
    mine.mockResolvedValue({ code: 'ABC234' });
    renderShelf();

    expect(await screen.findByText('방 화면')).toBeInTheDocument();
  });
});
