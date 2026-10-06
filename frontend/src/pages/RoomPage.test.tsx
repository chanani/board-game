import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaperSafariSessionView, Room } from '../api/types';
import { RoomPage } from './RoomPage';

const channel = vi.hoisted(() => ({ value: {} as Record<string, unknown>, options: undefined as unknown }));
vi.mock('../room/useRoomChannel', () => ({
  useRoomChannel: (_code: string, options?: unknown) => {
    channel.options = options;
    return channel.value;
  },
}));
const toast = vi.hoisted(() => ({ show: vi.fn() }));
vi.mock('../components/Toast', () => ({ useToast: () => toast }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ member: { id: 3, loginId: 'carol01', nickname: '캐롤' } }) }));
vi.mock('../api/rooms', () => ({ roomsApi: { seat: vi.fn(), leave: vi.fn(), start: vi.fn(), forfeit: vi.fn() } }));

const members = [
  { id: 1, nickname: '앨리스', host: true, connected: true, offlineSeconds: 0 },
  { id: 2, nickname: '밥', host: false, connected: true, offlineSeconds: 0 },
];
const baseRoom: Room = {
  code: 'ABC234', name: '앨리스의 방', gameType: 'PAPER_SAFARI', gameTypeName: '페이퍼 사파리', status: 'PLAYING',
  hostId: 1, maxPlayers: 4, locked: false, members, spectators: [{ id: 3, nickname: '캐롤' }],
};

function setChannel(overrides: Record<string, unknown>) {
  channel.value = {
    room: baseRoom, receivedAt: 0, view: null, transition: null, log: [], missing: false,
    send: vi.fn(), nicknameOf: (id: number) => members.find((member) => member.id === id)?.nickname ?? '떠난 플레이어', errorSeq: 0,
    ...overrides,
  };
}

function renderRoom() {
  return render(
    <MemoryRouter initialEntries={['/rooms/ABC234']}>
      <Routes>
        <Route path="/rooms/:code" element={<RoomPage />} />
        <Route path="/games/:slug" element={<p>로비 화면</p>} />
        <Route path="/" element={<p>목록 화면</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  toast.show.mockReset();
});
afterEach(() => window.sessionStorage.clear());

describe('RoomPage 관전자', () => {
  it('관전자는 방에 있는 사람으로 보고 내보내지 않으며 관전 인원을 보여준다', async () => {
    setChannel({});
    renderRoom();
    await act(async () => {});

    expect(screen.getByRole('heading', { name: '앨리스의 방' })).toBeInTheDocument();
    expect(screen.getByText(/👀 관전 1명/)).toBeInTheDocument();
    expect(toast.show).not.toHaveBeenCalledWith('방에서 나왔어요.', 'info');
    expect(channel.options).toEqual({ poll: true });
  });

  it('참가자도 관전자도 아니면 방에서 나왔다고 알리고 로비로 간다', async () => {
    setChannel({ room: { ...baseRoom, spectators: [] } });
    renderRoom();

    expect(await screen.findByText('로비 화면')).toBeInTheDocument();
    expect(toast.show).toHaveBeenCalledWith('방에서 나왔어요.', 'info');
  });

  it('보던 방이 사라지면(missing) 그 게임 로비로 간다', async () => {
    setChannel({ missing: true });
    renderRoom();

    expect(await screen.findByText('로비 화면')).toBeInTheDocument();
  });

  it('관전자가 대기 중인 방에서 자리에 앉기를 누르면 seat를 부른다', async () => {
    const { roomsApi } = await import('../api/rooms');
    setChannel({ room: { ...baseRoom, status: 'WAITING' } });
    renderRoom();

    await userEvent.click(screen.getByRole('button', { name: '자리에 앉기' }));

    expect(roomsApi.seat).toHaveBeenCalledWith('ABC234');
  });
});

describe('RoomPage 관전자 나가기', () => {
  it('관전자는 게임 중에도 기권 확인 없이 바로 나간다', async () => {
    const { roomsApi } = await import('../api/rooms');
    vi.mocked(roomsApi.leave).mockResolvedValue(undefined);
    setChannel({});
    renderRoom();

    await userEvent.click(screen.getByRole('button', { name: '나가기' }));

    expect(roomsApi.leave).toHaveBeenCalledWith('ABC234');
    expect(screen.queryByText(/기권 처리/)).not.toBeInTheDocument();
  });
});

describe('RoomPage 결과 모달', () => {
  const finished: PaperSafariSessionView = {
    readyPlayerIds: [],
    game: {
      viewerId: 3, status: 'GAME_OVER', roundNumber: 3, tokens: { '1': 3, '3': 1 }, lastRoundResult: null, winnerId: 1,
      round: { phase: 'ROUND_OVER', currentPlayerId: 1, deckSize: 0, discardTop: null, held: null, boards: [] },
    },
  };
  const waitingWithMe: Room = {
    ...baseRoom, status: 'WAITING', spectators: [],
    members: [members[0], { id: 3, nickname: '캐롤', host: false, connected: true, offlineSeconds: 0 }],
  };

  it('한 번 닫은 게임 결과는 방에 다시 들어와도 뜨지 않는다', async () => {
    setChannel({ room: waitingWithMe, view: finished });
    const first = renderRoom();
    expect(await screen.findByRole('dialog', { name: '게임 종료' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '대기실로 돌아가기' }));
    first.unmount();

    renderRoom();
    await act(async () => {});
    expect(screen.queryByRole('dialog', { name: '게임 종료' })).not.toBeInTheDocument();
  });
});
