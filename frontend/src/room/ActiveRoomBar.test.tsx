import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActiveRoomBar } from './ActiveRoomBar';

const mine = vi.hoisted(() => vi.fn());
vi.mock('../api/rooms', () => ({ roomsApi: { mine: () => mine() } }));

const myRoom = { code: 'ABC234', name: '앨리스의 방' };
const BAR = /참여 중인 방으로 돌아가기/;

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <ActiveRoomBar />
      <Routes>
        <Route path="/" element={<p>목록 화면</p>} />
        <Route path="/rooms/:code" element={<p>방 화면</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mine.mockReset();
});
afterEach(() => vi.useRealTimers());

describe('ActiveRoomBar', () => {
  it('방에 있고 다른 화면이면 돌아가기 바가 보이고, 누르면 그 방으로 간다', async () => {
    mine.mockResolvedValue(myRoom);
    renderAt('/');

    const bar = await screen.findByRole('button', { name: BAR });
    expect(bar).toHaveTextContent('참여 중인 방으로 돌아가기 · 앨리스의 방');
    await userEvent.click(bar);

    expect(await screen.findByText('방 화면')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: BAR })).not.toBeInTheDocument();
  });

  it('방으로 돌아가면 여백과 html 표시를 치운다', async () => {
    mine.mockResolvedValue(myRoom);
    renderAt('/');

    await userEvent.click(await screen.findByRole('button', { name: BAR }));
    expect(document.documentElement.dataset.roomBar).toBeUndefined();
    expect(screen.queryByTestId('room-bar-spacer')).not.toBeInTheDocument();
  });

  it('바가 보이면 여백과 html 표시가 함께 있다', async () => {
    mine.mockResolvedValue(myRoom);
    renderAt('/');

    await screen.findByRole('button', { name: BAR });
    expect(screen.getByTestId('room-bar-spacer')).toBeInTheDocument();
    expect(document.documentElement.dataset.roomBar).toBe('on');
  });

  it('그 방 화면에서는 숨긴다', async () => {
    mine.mockResolvedValue(myRoom);
    renderAt('/rooms/ABC234');
    await act(async () => {});

    expect(mine).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: BAR })).not.toBeInTheDocument();
  });

  it('방에 없으면 숨긴다', async () => {
    mine.mockResolvedValue(null);
    renderAt('/');
    await act(async () => {});

    expect(mine).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: BAR })).not.toBeInTheDocument();
  });

  it('5초마다 다시 확인한다', async () => {
    vi.useFakeTimers();
    mine.mockResolvedValue(null);
    renderAt('/');
    await act(async () => {});
    expect(mine).toHaveBeenCalledTimes(1);

    mine.mockResolvedValue(myRoom);
    await act(async () => { vi.advanceTimersByTime(5000); });

    expect(mine).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: BAR })).toBeInTheDocument();
  });

  it('방 화면에서 나가 다른 화면으로 가면, 새로 확인하기 전에는 바를 띄우지 않는다', async () => {
    mine.mockResolvedValue(myRoom);
    render(
      <MemoryRouter initialEntries={['/rooms/ABC234']}>
        <ActiveRoomBar />
        <Routes>
          <Route path="/" element={<p>목록 화면</p>} />
          <Route path="/rooms/:code" element={<Link to="/">나가기</Link>} />
        </Routes>
      </MemoryRouter>,
    );
    await act(async () => {});

    let resolveNext: (value: null) => void = () => {};
    mine.mockReturnValue(new Promise((resolve) => { resolveNext = resolve; }));
    await userEvent.click(screen.getByRole('link', { name: '나가기' }));

    expect(screen.getByText('목록 화면')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: BAR })).not.toBeInTheDocument();
    await act(async () => resolveNext(null));
    expect(screen.queryByRole('button', { name: BAR })).not.toBeInTheDocument();
  });
});
