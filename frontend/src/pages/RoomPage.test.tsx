import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaperSafariSessionView, Room } from '../api/types';
import { RoomPage } from './RoomPage';
import { setMediaMatches } from '../test/media';
import { PC_QUERY } from '../lib/useMediaQuery';

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
const chat = vi.hoisted(() => ({ args: [] as unknown[], send: vi.fn(() => true) }));
vi.mock('../room/useRoomChat', () => ({
  useRoomChat: (...args: unknown[]) => {
    chat.args = args;
    return { messages: [{ id: 1, memberId: 1, nickname: '앨리스', text: '잘 부탁해요', sentAt: '2026-10-06T00:00:00Z' }], send: chat.send };
  },
}));
vi.mock('../api/rooms', () => ({ roomsApi: { seat: vi.fn(), leave: vi.fn(), start: vi.fn(), forfeit: vi.fn(), kick: vi.fn(), ready: vi.fn(), updateSettings: vi.fn() } }));

const members = [
  { id: 1, nickname: '앨리스', host: true, connected: true, offlineSeconds: 0, ready: false },
  { id: 2, nickname: '밥', host: false, connected: true, offlineSeconds: 0, ready: false },
];
const baseRoom: Room = {
  code: 'ABC234', name: '앨리스의 방', gameType: 'PAPER_SAFARI', gameTypeName: '페이퍼 사파리', status: 'PLAYING',
  hostId: 1, maxPlayers: 4, locked: false, members, spectators: [{ id: 3, nickname: '캐롤' }], theme: 'WOOD',
};

function setChannel(overrides: Record<string, unknown>) {
  channel.value = {
    room: baseRoom, receivedAt: 0, view: null, transition: null, log: [], missing: false,
    send: vi.fn(), nicknameOf: (id: number) => members.find((member) => member.id === id)?.nickname ?? '떠난 플레이어', errorSeq: 0,
    ...overrides,
  };
}

function renderRoom() {
  return render(roomTree());
}

function roomTree() {
  return (
    <MemoryRouter initialEntries={['/rooms/ABC234']}>
      <Routes>
        <Route path="/rooms/:code" element={<RoomPage />} />
        <Route path="/games/:slug" element={<p>로비 화면</p>} />
        <Route path="/" element={<p>목록 화면</p>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  toast.show.mockReset();
});
afterEach(() => {
  window.sessionStorage.clear();
  vi.useRealTimers();
});

describe('RoomPage 관전자', () => {
  it('관전자는 방에 있는 사람으로 보고 내보내지 않으며 관전 인원을 보여준다', async () => {
    setChannel({});
    renderRoom();
    await act(async () => {});

    expect(screen.getByRole('heading', { name: '앨리스의 방' })).toBeInTheDocument();
    expect(screen.getByLabelText('관전 1명')).toBeInTheDocument();
    expect(toast.show).not.toHaveBeenCalledWith('방에서 나왔어요.', 'info');
    expect(channel.options).toEqual({ poll: true, meId: 3 });
  });

  it('방 제목 아래에 게임·상태·인원·관전·비공개 칩을 보여준다', async () => {
    setChannel({ room: { ...baseRoom, locked: true } });
    renderRoom();
    await act(async () => {});

    const chips = screen.getByTestId('room-chips');
    expect(chips).toHaveTextContent('페이퍼 사파리');
    expect(chips).not.toHaveTextContent('게임 중');
    expect(chips.textContent).not.toContain('●');
    expect(chips).toHaveTextContent('2/4명');
    expect(chips).toHaveTextContent('비공개');
    expect(chips.textContent).not.toContain('👀');
    expect(within(chips).getByLabelText('관전 1명').querySelector('svg')).not.toBeNull();
  });

  it('나가기 버튼은 방 제목과 같은 줄에 작게 두고, 칩은 줄바꿈 없이 한 줄에 둔다', async () => {
    setChannel({ room: { ...baseRoom, locked: true } });
    renderRoom();
    await act(async () => {});

    const leave = screen.getByRole('button', { name: '나가기' });
    expect(screen.getByTestId('room-title-row')).toContainElement(leave);
    expect(screen.getByTestId('room-title-row')).toContainElement(screen.getByRole('heading', { level: 1 }));
    expect(leave).toHaveClass('shrink-0', 'px-2.5', 'py-1', 'text-xs');
    const chips = screen.getByTestId('room-chips');
    expect(chips).toHaveClass('flex-nowrap', 'overflow-hidden');
    expect(chips).not.toHaveClass('flex-wrap');
    expect(within(chips).getByLabelText('비공개')).toHaveClass('text-[10px]');
  });

  it('관전자가 없으면 관전 칩을 숨기고 대기 중이면 대기 중 칩을 보여준다', async () => {
    setChannel({ room: { ...baseRoom, status: 'WAITING', spectators: [], members: [...members, { ...members[1], id: 3, nickname: '캐롤' }] } });
    renderRoom();
    await act(async () => {});

    expect(screen.queryByLabelText(/^관전 \d+명$/)).not.toBeInTheDocument();
    expect(screen.getByTestId('room-chips')).toHaveTextContent('대기 중');
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

describe('RoomPage 테마', () => {
  it('방 화면 최상위와 배경 장면에 방 테마를 단다', async () => {
    setChannel({ room: { ...baseRoom, theme: 'MOONLIT' } });
    const { container } = renderRoom();
    await act(async () => {});

    expect(container.firstElementChild).toHaveAttribute('data-theme', 'MOONLIT');
    expect(screen.getByTestId('room-backdrop')).toHaveAttribute('data-theme', 'MOONLIT');
  });

  it('방을 떠나면 테마 배경도 함께 사라진다', async () => {
    setChannel({ room: { ...baseRoom, theme: 'BEACH' } });
    const { unmount } = renderRoom();
    await act(async () => {});

    unmount();

    expect(document.querySelector('[data-theme]')).toBeNull();
  });
});

describe('RoomPage 방장 내보내기', () => {
  it('대기 중에 방장이 확인 창에서 내보내기를 누르면 kick을 부른다', async () => {
    const { roomsApi } = await import('../api/rooms');
    vi.mocked(roomsApi.kick).mockResolvedValue(undefined);
    const hosted = [{ ...members[1], id: 3, nickname: '캐롤', host: true }, members[1]];
    setChannel({ room: { ...baseRoom, status: 'WAITING', hostId: 3, members: hosted, spectators: [] } });
    renderRoom();

    await userEvent.click(screen.getByRole('button', { name: '내보내기' }));
    await userEvent.click(within(screen.getByRole('dialog', { name: '밥님을 내보낼까요?' })).getByRole('button', { name: '내보내기' }));

    expect(roomsApi.kick).toHaveBeenCalledWith('ABC234', 2);
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

describe('RoomPage 참가자 나가기 확인', () => {
  const playing: Room = { ...baseRoom, spectators: [], members: [members[0], { id: 3, nickname: '캐롤', host: false, connected: true, offlineSeconds: 0, ready: false }] };

  it('게임 중 참가자가 나가기를 누르면 확인 창이 뜨고, 취소하면 나가지 않고 닫힌다', async () => {
    const { roomsApi } = await import('../api/rooms');
    vi.mocked(roomsApi.leave).mockClear();
    setChannel({ room: playing });
    renderRoom();

    await userEvent.click(screen.getByRole('button', { name: '나가기' }));
    const dialog = await screen.findByRole('dialog', { name: '정말 나갈까요?' });
    await userEvent.click(within(dialog).getByRole('button', { name: '취소' }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: '정말 나갈까요?' })).not.toBeInTheDocument());
    expect(roomsApi.leave).not.toHaveBeenCalled();
  });

  it('대기실에서는 참가자도 확인 창 없이 바로 나간다', async () => {
    const { roomsApi } = await import('../api/rooms');
    vi.mocked(roomsApi.leave).mockResolvedValue(undefined);
    setChannel({ room: { ...playing, status: 'WAITING' } });
    renderRoom();

    await userEvent.click(screen.getByRole('button', { name: '나가기' }));

    expect(screen.queryByRole('dialog', { name: '정말 나갈까요?' })).not.toBeInTheDocument();
    expect(roomsApi.leave).toHaveBeenCalledWith('ABC234');
  });

  it('확인 창에서 나가기를 누르면 방을 나간다', async () => {
    const { roomsApi } = await import('../api/rooms');
    vi.mocked(roomsApi.leave).mockResolvedValue(undefined);
    setChannel({ room: playing });
    renderRoom();

    await userEvent.click(screen.getByRole('button', { name: '나가기' }));
    const dialog = await screen.findByRole('dialog', { name: '정말 나갈까요?' });
    await userEvent.click(within(dialog).getByRole('button', { name: '나가기' }));

    expect(roomsApi.leave).toHaveBeenCalledWith('ABC234');
  });
});

describe('RoomPage 결과 모달', () => {
  const boardOf = (playerId: number) => ({ playerId, slots: [] });
  const finished: PaperSafariSessionView = {
    game: {
      viewerId: 3, status: 'GAME_OVER', roundNumber: 1, winnerId: 1,
      lastRoundResult: { players: [{ playerId: 1, score: 3, outcome: 'WIN' }, { playerId: 3, score: 9, outcome: 'LOSE' }] },
      round: { phase: 'ROUND_OVER', currentPlayerId: 1, deckSize: 0, discardTop: null, held: null, boards: [boardOf(1), boardOf(3)] },
    },
  };
  const waitingWithMe: Room = {
    ...baseRoom, status: 'WAITING', spectators: [],
    members: [members[0], { id: 3, nickname: '캐롤', host: false, connected: true, offlineSeconds: 0, ready: false }],
  };

  it('한 번 닫은 게임 결과는 방에 다시 들어와도 뜨지 않는다', async () => {
    setChannel({ room: { ...waitingWithMe, hostId: 3, members: [{ ...members[0], host: false }, { ...waitingWithMe.members[1], host: true }] }, view: finished });
    const first = renderRoom();
    expect(await screen.findByRole('dialog', { name: '게임 결과' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '대기실로' }));
    first.unmount();

    renderRoom();
    await act(async () => {});
    expect(screen.queryByRole('dialog', { name: '게임 결과' })).not.toBeInTheDocument();
  });

  it('같은 방에서 승자·점수가 똑같은 다음 게임이 끝나면 결과를 다시 보여준다', async () => {
    const { roomsApi } = await import('../api/rooms');
    vi.mocked(roomsApi.ready).mockResolvedValue(waitingWithMe);
    setChannel({ room: waitingWithMe, view: finished });
    const page = renderRoom();
    await userEvent.click(await screen.findByRole('button', { name: '다음 게임 준비' }));
    expect(screen.queryByRole('dialog', { name: '게임 결과' })).not.toBeInTheDocument();

    const playingView: PaperSafariSessionView = { ...finished, game: { ...finished.game, status: 'IN_ROUND', winnerId: null } };
    setChannel({ room: { ...waitingWithMe, status: 'PLAYING' }, view: playingView });
    page.rerender(roomTree());
    await act(async () => {});

    vi.useFakeTimers();
    setChannel({ room: waitingWithMe, view: finished });
    page.rerender(roomTree());
    // 결과 창은 마무리 연출(카드 뒤집기 → "게임 끝!" 배너)이 끝난 뒤에 열린다.
    expect(screen.queryByRole('dialog', { name: '게임 결과' })).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(2500); });
    vi.useRealTimers();

    expect(screen.getByRole('dialog', { name: '게임 결과' })).toBeInTheDocument();
  });

  it('게임이 끝날 때 방(대기 중)이 끝 화면보다 먼저 와도 테이블을 내리지 않는다(마지막 비행이 끊기지 않게)', async () => {
    const meAsPlayer = { ...waitingWithMe, status: 'PLAYING' as const };
    const playingView: PaperSafariSessionView = { ...finished, game: { ...finished.game, status: 'IN_ROUND', winnerId: null } };
    setChannel({ room: meAsPlayer, view: playingView });
    const page = renderRoom();
    const table = await screen.findByTestId('turn-bar');

    // 서버는 방 방송을 먼저, 게임 화면을 나중에 보낸다.
    setChannel({ room: waitingWithMe, view: playingView });
    page.rerender(roomTree());
    expect(screen.getByTestId('turn-bar')).toBe(table);
    expect(screen.queryByRole('button', { name: /준비/ })).not.toBeInTheDocument();

    setChannel({ room: waitingWithMe, view: finished });
    page.rerender(roomTree());
    expect(screen.getByTestId('turn-bar')).toBe(table);
  });

  it('다른 방에서 닫은 결과 기록은 지우지 않는다', async () => {
    window.sessionStorage.setItem('bg.dismissedGameOver', JSON.stringify(['XYZ789:1:{}']));
    setChannel({ room: { ...waitingWithMe, status: 'PLAYING' }, view: null });
    renderRoom();
    await act(async () => {});

    expect(JSON.parse(window.sessionStorage.getItem('bg.dismissedGameOver') ?? '[]')).toEqual(['XYZ789:1:{}']);
  });

  it('방 게임과 다른 종류의 화면은 그리지 않는다', async () => {
    setChannel({ room: { ...baseRoom, spectators: [], members: [...members, { ...members[1], id: 3, nickname: '캐롤' }] }, view: { gameType: 'UNO', game: { status: 'IN_PROGRESS' } } });
    renderRoom();
    await act(async () => {});

    expect(screen.getByText('게임 화면을 불러오는 중…')).toBeInTheDocument();
    expect(screen.queryByTestId('turn-bar')).not.toBeInTheDocument();
  });

  it('관전자도 게임 결과(승자)를 보고 닫을 수 있다', async () => {
    const spectatorView: PaperSafariSessionView = { game: { ...finished.game, round: { ...finished.game.round, boards: [boardOf(1), boardOf(2)] } } };
    setChannel({ room: { ...baseRoom, status: 'WAITING' }, view: spectatorView });
    renderRoom();

    const dialog = await screen.findByRole('dialog', { name: '게임 결과' });
    expect(await within(dialog).findByRole('heading', { name: '앨리스님 승리!' }, { timeout: 3000 })).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: '대기실로' }));

    expect(screen.queryByRole('dialog', { name: '게임 결과' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '자리에 앉기' })).toBeInTheDocument();
  });

  it('참가자가 다음 게임 준비를 누르면 준비 요청을 보내고 결과 창을 닫는다', async () => {
    const { roomsApi } = await import('../api/rooms');
    vi.mocked(roomsApi.ready).mockResolvedValue(waitingWithMe);
    setChannel({ room: waitingWithMe, view: finished });
    renderRoom();

    await userEvent.click(await screen.findByRole('button', { name: '다음 게임 준비' }));

    expect(roomsApi.ready).toHaveBeenCalledWith('ABC234', true);
    expect(screen.queryByRole('dialog', { name: '게임 결과' })).not.toBeInTheDocument();
  });

  it('준비 요청이 실패하면 알리고 결과 창을 그대로 둔다', async () => {
    const { roomsApi } = await import('../api/rooms');
    vi.mocked(roomsApi.ready).mockRejectedValue(new Error('실패'));
    setChannel({ room: waitingWithMe, view: finished });
    renderRoom();

    await userEvent.click(await screen.findByRole('button', { name: '다음 게임 준비' }));

    expect(toast.show).toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: '게임 결과' })).toBeInTheDocument();
  });

  it('보던 게임이 끝나 자동으로 자리에 앉은 관전자도 결과를 본다', async () => {
    setChannel({ room: { ...baseRoom, status: 'PLAYING' }, view: { game: { ...finished.game, status: 'IN_ROUND', winnerId: null } } });
    const page = renderRoom();
    await act(async () => {});

    vi.useFakeTimers();
    setChannel({ room: waitingWithMe, view: { game: { ...finished.game, round: { ...finished.game.round, boards: [boardOf(1), boardOf(2)] } } } });
    page.rerender(roomTree());
    act(() => { vi.advanceTimersByTime(2500); });
    vi.useRealTimers();

    expect(screen.getByRole('dialog', { name: '게임 결과' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다음 게임 준비' })).toBeInTheDocument();
  });
});

describe('RoomPage 준비와 채팅', () => {
  const playingView: PaperSafariSessionView = {
    game: {
      viewerId: 3, status: 'IN_ROUND', roundNumber: 1, winnerId: null, lastRoundResult: null,
      round: { phase: 'DRAW', currentPlayerId: 1, deckSize: 30, discardTop: null, held: null, boards: [{ playerId: 1, slots: [] }, { playerId: 3, slots: [] }] },
    },
  };
  const waiting: Room = {
    ...baseRoom, status: 'WAITING', spectators: [],
    members: [members[0], { id: 3, nickname: '캐롤', host: false, connected: true, offlineSeconds: 0, ready: false }],
  };

  it('대기실에서 준비하기를 누르면 준비 요청을 보내고 옆에 방 채팅이 보인다', async () => {
    const { roomsApi } = await import('../api/rooms');
    vi.mocked(roomsApi.ready).mockResolvedValue(waiting);
    setChannel({ room: waiting });
    renderRoom();

    await userEvent.click(screen.getByRole('button', { name: '준비하기' }));

    expect(roomsApi.ready).toHaveBeenCalledWith('ABC234', true);
    expect(screen.getByText('잘 부탁해요')).toBeInTheDocument();
    expect(chat.args).toEqual(['ABC234', true, 3]);
    expect(screen.getByTestId('room-chips')).toHaveTextContent('대기 중');
    expect(screen.getByTestId('room-chips')).toHaveTextContent('2/4명');
  });

  it('대기실에서 게임이 시작되면 PC 오른쪽 채팅 칸으로 이어진다', async () => {
    setChannel({ room: waiting });
    const page = renderRoom();
    await act(async () => {});

    setChannel({ room: { ...waiting, status: 'PLAYING' }, view: playingView });
    page.rerender(roomTree());

    expect(screen.getByTestId('game-chat-panel')).toBeInTheDocument();
  });

  it('PC 채팅 칸은 화면 높이를 따라 늘어나지 않고 최대 560px이다', async () => {
    setMediaMatches(true);
    setChannel({ room: { ...waiting, status: 'PLAYING' }, view: playingView });
    renderRoom();
    await act(async () => {});

    expect(screen.getByTestId('game-chat-panel')).toHaveClass('lg:h-[min(35rem,calc(100vh-8rem))]');
  });

  it('PC 게임 화면에는 오른쪽 채팅 칸이 늘 보이고 떠 있는 채팅 버튼은 없다', async () => {
    setMediaMatches(true);
    setChannel({ room: { ...waiting, status: 'PLAYING' }, view: playingView });
    renderRoom();
    await act(async () => {});

    expect(screen.getByTestId('game-chat-panel')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /채팅 열기/ })).not.toBeInTheDocument();
  });

  it('모바일 게임 화면에는 테이블 아래 채팅 줄이 있고, 줄을 누르면 시트가 열린다', async () => {
    setMediaMatches(false);
    setChannel({ room: { ...waiting, status: 'PLAYING' }, view: playingView });
    renderRoom();
    await act(async () => {});

    expect(screen.getByTestId('chat-strip')).toBeInTheDocument();
    expect(screen.queryByTestId('game-chat-panel')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /채팅 전체 보기/ }));
    expect(screen.getByRole('dialog', { name: '채팅' })).toHaveAttribute('data-variant', 'sheet');
  });

  it('휴대폰을 눕히면 채팅 줄이 왼쪽 정보 칸 안에 있다', async () => {
    setMediaMatches((query) => query.includes('orientation: landscape'));
    setChannel({ room: { ...waiting, status: 'PLAYING' }, view: playingView });
    renderRoom();
    await act(async () => {});

    expect(within(screen.getByTestId('table-aside')).getByTestId('chat-strip')).toBeInTheDocument();
  });

  it('눕힌 화면의 좁은 채팅 줄은 잘리지 않는 짧은 안내 문구를 쓴다', async () => {
    setMediaMatches((query) => query.includes('orientation: landscape'));
    setChannel({ room: { ...waiting, status: 'PLAYING' }, view: playingView });
    renderRoom();
    await act(async () => {});

    expect(within(screen.getByTestId('table-aside')).getByRole('textbox', { name: '채팅 입력' })).toHaveAttribute('placeholder', '메시지');
  });

  it('세로 휴대폰의 채팅 줄은 원래 안내 문구를 쓴다', async () => {
    setMediaMatches(false);
    setChannel({ room: { ...waiting, status: 'PLAYING' }, view: playingView });
    renderRoom();
    await act(async () => {});

    expect(within(screen.getByTestId('chat-strip')).getByRole('textbox', { name: '채팅 입력' })).toHaveAttribute('placeholder', '메시지를 입력해요');
  });

  it('폭은 PC만큼 넓어도 높이가 낮은 눕힌 화면이면 왼쪽 칸에 채팅 줄을 두고 PC 채팅 칸은 없다', async () => {
    setMediaMatches((query) => query === PC_QUERY || query.includes('orientation: landscape'));
    setChannel({ room: { ...waiting, status: 'PLAYING' }, view: playingView });
    renderRoom();
    await act(async () => {});

    expect(within(screen.getByTestId('table-aside')).getByTestId('chat-strip')).toBeInTheDocument();
    expect(screen.queryByTestId('game-chat-panel')).not.toBeInTheDocument();
  });
});

describe('RoomPage 상태 바', () => {
  const waiting: Room = {
    ...baseRoom, status: 'WAITING', spectators: [],
    members: [members[0], { id: 3, nickname: '캐롤', host: false, connected: true, offlineSeconds: 0, ready: false }],
  };
  const playingView: PaperSafariSessionView = {
    game: {
      viewerId: 3, status: 'IN_ROUND', roundNumber: 1, winnerId: null, lastRoundResult: null,
      round: { phase: 'DRAW', currentPlayerId: 1, deckSize: 30, discardTop: null, held: null, boards: [{ playerId: 1, slots: [] }, { playerId: 3, slots: [] }] },
    },
  };

  it('대기 중에는 상태 바에 코드 복사 칩이 있고 진행 기록 버튼은 없다', async () => {
    setChannel({ room: waiting });
    renderRoom();
    await act(async () => {});

    const bar = screen.getByTestId('room-status-bar');
    const code = within(bar).getByRole('button', { name: '방 코드 ABC234 복사' });
    expect(code).toHaveTextContent('ABC234');
    expect(code.querySelector('svg')).not.toBeNull();
    expect(within(bar).queryByRole('button', { name: /진행 기록/ })).not.toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: '나가기' })).toBeInTheDocument();
  });

  it('게임 중에는 상태 바에 코드 칩도 진행 기록 버튼도 없다', async () => {
    setChannel({ room: { ...waiting, status: 'PLAYING' }, view: playingView });
    renderRoom();
    await act(async () => {});

    const bar = screen.getByTestId('room-status-bar');
    expect(within(bar).queryByRole('button', { name: /진행 기록/ })).not.toBeInTheDocument();
    expect(within(bar).queryByRole('button', { name: /방 코드/ })).not.toBeInTheDocument();
    expect(screen.getByTestId('turn-bar')).toBeInTheDocument();
  });

  it('휴대폰을 눕힌 게임 화면에서는 상태 바를 테이블 왼쪽 칸으로 옮기고 칩을 감싼다', async () => {
    setMediaMatches((query) => query.includes('orientation: landscape'));
    setChannel({ room: { ...waiting, status: 'PLAYING' }, view: playingView });
    renderRoom();
    await act(async () => {});

    const aside = screen.getByTestId('table-aside');
    expect(within(aside).getByTestId('room-status-bar')).toBeInTheDocument();
    expect(screen.getAllByTestId('room-status-bar')).toHaveLength(1);
    expect(screen.getByTestId('room-chips')).toHaveClass('flex-wrap');
  });

  it('상태 칩은 이모지 대신 아이콘을 쓴다', async () => {
    setChannel({ room: { ...waiting, locked: true } });
    renderRoom();
    await act(async () => {});

    const chips = screen.getByTestId('room-chips');
    expect(chips.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
    expect(chips.querySelectorAll('svg').length).toBeGreaterThanOrEqual(3);
  });
});

describe('RoomPage 방 설정', () => {
  const me = { id: 3, nickname: '캐롤', host: false, connected: true, offlineSeconds: 0, ready: false };
  const hostWaiting: Room = {
    ...baseRoom, status: 'WAITING', spectators: [], hostId: 3,
    members: [{ ...members[0], host: false }, { ...me, host: true }],
  };

  it('대기 중인 방장에게만 방 설정 버튼이 있고, 저장하면 설정 API를 부른다', async () => {
    const { roomsApi } = await import('../api/rooms');
    vi.mocked(roomsApi.updateSettings).mockResolvedValue(hostWaiting);
    setChannel({ room: hostWaiting });
    renderRoom();
    await act(async () => {});

    await userEvent.click(within(screen.getByTestId('room-status-bar')).getByRole('button', { name: '방 설정' }));
    await userEvent.click(within(await screen.findByRole('dialog', { name: '방 설정' })).getByRole('button', { name: '저장' }));

    expect(roomsApi.updateSettings).toHaveBeenCalledWith('ABC234', hostWaiting.maxPlayers, hostWaiting.theme);
  });

  it('방장이 아니거나 게임 중이면 방 설정 버튼이 없다', async () => {
    setChannel({ room: { ...hostWaiting, hostId: 1, members: [members[0], me] } });
    const guest = renderRoom();
    await act(async () => {});
    expect(screen.queryByRole('button', { name: '방 설정' })).not.toBeInTheDocument();
    guest.unmount();

    setChannel({ room: { ...hostWaiting, status: 'PLAYING' } });
    renderRoom();
    await act(async () => {});
    expect(screen.queryByRole('button', { name: '방 설정' })).not.toBeInTheDocument();
  });

  it('저장이 실패하면 오류를 알리고 창을 그대로 둔다', async () => {
    const { roomsApi } = await import('../api/rooms');
    vi.mocked(roomsApi.updateSettings).mockRejectedValue(new Error('지금 있는 인원보다 적게 줄일 수 없어요.'));
    setChannel({ room: hostWaiting });
    renderRoom();
    await act(async () => {});

    await userEvent.click(screen.getByRole('button', { name: '방 설정' }));
    await userEvent.click(within(await screen.findByRole('dialog', { name: '방 설정' })).getByRole('button', { name: '저장' }));

    await waitFor(() => expect(toast.show).toHaveBeenCalled());
    expect(screen.getByRole('dialog', { name: '방 설정' })).toBeInTheDocument();
  });
});

describe('RoomPage 우노', () => {
  const unoRoom: Room = {
    ...baseRoom, gameType: 'UNO', gameTypeName: '우노', spectators: [],
    members: [...members, { id: 3, nickname: '캐롤', host: false, connected: true, offlineSeconds: 0, ready: false }],
  };
  const unoGame = {
    viewerId: 3, status: 'IN_PROGRESS', startedAt: 1000, stage: 'PLAY', currentPlayerId: 1, direction: 'CLOCKWISE', currentColor: 'RED',
    discardTop: { id: 9, kind: 'NUMBER', color: 'RED', number: 5 }, discardCount: 1, drawPileCount: 80, participantIds: [1, 2, 3],
    players: [{ playerId: 1, cardCount: 7, unoDeclared: false }, { playerId: 2, cardCount: 7, unoDeclared: false }, { playerId: 3, cardCount: 7, unoDeclared: false }],
    hand: [{ id: 3, kind: 'NUMBER', color: 'RED', number: 2 }], playableCardIds: [], wildDrawFourRisky: false, drawnCardId: null,
    canCallUno: false, unoCatch: null, canCatch: false, challenge: null, reveal: null, result: null, winnerId: null,
    deadline: null, serverNow: 0, lastAutoActorIds: [], autoActSeq: 0, events: [],
  };

  it('우노 방이면 우노 테이블을 그린다', async () => {
    setChannel({ room: unoRoom, view: { gameType: 'UNO', game: unoGame } });
    renderRoom();
    await act(async () => {});

    expect(screen.getByTestId('uno-table')).toBeInTheDocument();
  });

  it('끝난 우노 게임은 결과 창을 띄우고, 닫으면 방 코드와 시작 시각으로 기억한다', async () => {
    const { roomsApi } = await import('../api/rooms');
    vi.mocked(roomsApi.ready).mockResolvedValue(unoRoom);
    const over = { ...unoGame, status: 'GAME_OVER', stage: null, currentPlayerId: null, winnerId: 1,
      result: { reason: 'EMPTY_HAND', winnerId: 1, points: 30, players: [] } };
    setChannel({ room: { ...unoRoom, status: 'WAITING' }, view: { gameType: 'UNO', game: over } });
    renderRoom();

    expect(await screen.findByRole('dialog', { name: '게임 결과' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '다음 게임 준비' }));
    await waitFor(() => expect(JSON.parse(window.sessionStorage.getItem('bg.dismissedGameOver') ?? '[]')).toContain('ABC234:UNO:1000'));
  });
});

describe('RoomPage 모르는 게임', () => {
  it('나가기 버튼으로 방을 떠나 목록으로 간다', async () => {
    const { roomsApi } = await import('../api/rooms');
    vi.mocked(roomsApi.leave).mockResolvedValue(undefined as never);
    setChannel({ room: { ...baseRoom, gameType: 'CHESS' } });
    renderRoom();

    await userEvent.click(screen.getByRole('button', { name: '나가기' }));

    expect(roomsApi.leave).toHaveBeenCalledWith('ABC234');
    expect(await screen.findByText('목록 화면')).toBeInTheDocument();
  });
});
