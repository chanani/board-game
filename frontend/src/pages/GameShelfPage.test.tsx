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

    expect((await screen.findAllByLabelText('대기 인원 알 수 없음'))[0]).toHaveTextContent('–');
  });

  it('게임 상자를 누르면 그 게임 로비로 간다', async () => {
    list.mockResolvedValue([]);
    renderShelf();

    await userEvent.click(screen.getByRole('button', { name: '페이퍼 사파리 열기' }));

    expect(await screen.findByText('로비 화면')).toBeInTheDocument();
  });

  it('이미 방에 있어도 목록에 머문다', async () => {
    list.mockResolvedValue([]);
    mine.mockResolvedValue({ code: 'ABC234' });
    renderShelf();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(screen.queryByText('방 화면')).not.toBeInTheDocument();
    expect(screen.getByText('오늘은 뭘 할까요?')).toBeInTheDocument();
  });

  it('제목과 부제, 규칙 보기 버튼을 보여준다', async () => {
    list.mockResolvedValue([]);
    renderShelf();

    expect(screen.getByText('오늘은 뭘 할까요?')).toBeInTheDocument();
    expect(screen.getByText('목록에서 게임을 골라 주세요')).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: /규칙 보기/ })[0]);

    expect(await screen.findByRole('dialog', { name: '페이퍼 사파리 규칙' })).toBeInTheDocument();
  });

  it('우노 상자와 우노 규칙을 보여 준다', async () => {
    list.mockResolvedValue([]);
    renderShelf();

    expect(screen.getByRole('button', { name: '우노 열기' })).toBeInTheDocument();
    expect(screen.getByText('2~5인 · 손패를 먼저 비워라!')).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: /규칙 보기/ })[1]);

    expect(await screen.findByRole('dialog', { name: '우노 규칙' })).toBeInTheDocument();
  });

  it('도둑잡기 상자와 도둑잡기 규칙을 보여 준다', async () => {
    list.mockResolvedValue([]);
    renderShelf();

    expect(screen.getByRole('button', { name: '도둑잡기 열기' })).toBeInTheDocument();
    expect(screen.getByText('2~6인 · 조커를 피해라!')).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: /규칙 보기/ })[2]);

    expect(await screen.findByRole('dialog', { name: '도둑잡기 규칙' })).toBeInTheDocument();
  });
});
