import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/http';
import { roomsApi } from '../api/rooms';
import type { PaperSafariSessionView, Room } from '../api/types';
import { useRoomChannel } from './useRoomChannel';

type Handler = (body: unknown) => void;
const state = vi.hoisted(() => ({
  connected: false,
  handlers: new Map<string, (body: unknown) => void>(),
  publish: vi.fn(() => true),
  realtime: undefined as unknown,
}));

vi.mock('../realtime/RealtimeContext', () => {
  state.realtime = {
    subscribe: (destination: string, handler: Handler) => {
      state.handlers.set(destination, handler);
      return () => state.handlers.delete(destination);
    },
    publish: state.publish,
  };
  return { useRealtime: () => ({ realtime: state.realtime, connected: state.connected }) };
});

const toast = vi.hoisted(() => ({ show: vi.fn() }));
vi.mock('../components/Toast', () => ({ useToast: () => toast }));

const room = (name: string, status: Room['status'] = 'WAITING'): Room => ({
  code: 'ABCDEF',
  name,
  gameType: 'PAPER_SAFARI',
  gameTypeName: '페이퍼 사파리',
  status,
  hostId: 1,
  maxPlayers: 4, locked: false, spectators: [],
  members: [],
});

const sessionView = (roundNumber: number): PaperSafariSessionView => ({
  readyPlayerIds: [],
  game: {
    viewerId: 1, status: 'IN_ROUND', roundNumber, tokens: {}, lastRoundResult: null, winnerId: null,
    round: { phase: 'DRAW', currentPlayerId: 1, deckSize: 30, discardTop: null, held: null, boards: [] },
  },
});

describe('useRoomChannel', () => {
  beforeEach(() => {
    state.connected = false;
    state.handlers.clear();
    state.publish.mockClear();
    vi.restoreAllMocks();
  });

  it('GET 응답이 늦어도 먼저 도착한 푸시가 이긴다', async () => {
    let resolveGet: (value: Room) => void = () => {};
    vi.spyOn(roomsApi, 'get').mockReturnValue(new Promise((resolve) => { resolveGet = resolve; }));
    const { result } = renderHook(() => useRoomChannel('ABCDEF'));

    act(() => state.handlers.get('/topic/rooms/ABCDEF')?.(room('푸시')));
    await act(async () => resolveGet(room('오래된 GET')));

    expect(result.current.room?.name).toBe('푸시');
  });

  it('연결되면 방 정보를 다시 가져온다', async () => {
    const get = vi.spyOn(roomsApi, 'get').mockResolvedValue(room('방'));
    const { rerender } = renderHook(() => useRoomChannel('ABCDEF'));
    await act(async () => {});
    expect(get).toHaveBeenCalledTimes(1);

    state.connected = true;
    rerender();
    await act(async () => {});

    expect(get).toHaveBeenCalledTimes(2);
  });

  it('게임 중인 방을 받았는데 화면이 없으면 동기화를 요청한다', async () => {
    vi.spyOn(roomsApi, 'get').mockResolvedValue(room('방'));
    state.connected = true;
    renderHook(() => useRoomChannel('ABCDEF'));
    await act(async () => {});
    state.publish.mockClear();

    act(() => state.handlers.get('/topic/rooms/ABCDEF')?.(room('방', 'PLAYING')));

    expect(state.publish).toHaveBeenCalledWith('/app/rooms/ABCDEF/sync', {});
  });

  it('방을 이미 불러온 뒤 다시 가져오기가 실패해도 방을 잃지 않는다', async () => {
    const get = vi.spyOn(roomsApi, 'get').mockResolvedValueOnce(room('방'));
    const { result, rerender } = renderHook(() => useRoomChannel('ABCDEF'));
    await act(async () => {});
    expect(result.current.room?.name).toBe('방');

    get.mockRejectedValueOnce(new Error('network'));
    state.connected = true;
    rerender();
    await act(async () => {});

    expect(get).toHaveBeenCalledTimes(2);
    expect(toast.show).toHaveBeenCalled();
    expect(result.current.missing).toBe(false);
    expect(result.current.room?.name).toBe('방');
  });

  it('다시 가져오기가 404면 방을 불러온 뒤에도 missing이 된다', async () => {
    const get = vi.spyOn(roomsApi, 'get').mockResolvedValueOnce(room('방'));
    const { result, rerender } = renderHook(() => useRoomChannel('ABCDEF'));
    await act(async () => {});

    get.mockRejectedValueOnce(new ApiError(404, 'ROOM_NOT_FOUND', '없는 방'));
    state.connected = true;
    rerender();
    await act(async () => {});

    expect(result.current.missing).toBe(true);
  });

  it('다시 가져오기가 403 NOT_IN_ROOM이면(쫓겨남) 방을 불러온 뒤에도 missing이 되고 한 번만 알린다', async () => {
    const get = vi.spyOn(roomsApi, 'get').mockResolvedValueOnce(room('방'));
    const { result, rerender } = renderHook(() => useRoomChannel('ABCDEF'));
    await act(async () => {});
    toast.show.mockClear();

    get.mockRejectedValueOnce(new ApiError(403, 'NOT_IN_ROOM', '이 방의 참가자가 아닙니다.'));
    state.connected = true;
    rerender();
    await act(async () => {});

    expect(result.current.missing).toBe(true);
    expect(toast.show).toHaveBeenCalledTimes(1);
    expect(toast.show).toHaveBeenCalledWith('방에서 나왔어요.', 'info');
  });

  it('관전 중 확인(poll)에서 403 NOT_IN_ROOM이면 missing이 된다', async () => {
    vi.useFakeTimers();
    try {
      const get = vi.spyOn(roomsApi, 'get').mockResolvedValue(room('방', 'PLAYING'));
      const { result } = renderHook(() => useRoomChannel('ABCDEF', { poll: true }));
      await act(async () => {});

      get.mockRejectedValueOnce(new ApiError(403, 'NOT_IN_ROOM', '이 방의 참가자가 아닙니다.'));
      await act(async () => { await vi.advanceTimersByTimeAsync(5000); });

      expect(result.current.missing).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('동기화 오류가 NOT_IN_ROOM이어도 missing이 된다', async () => {
    vi.spyOn(roomsApi, 'get').mockResolvedValue(room('방', 'PLAYING'));
    const { result } = renderHook(() => useRoomChannel('ABCDEF'));
    await act(async () => {});
    toast.show.mockClear();

    act(() => state.handlers.get('/user/queue/errors')?.({ status: 403, code: 'NOT_IN_ROOM', message: '이 방의 참가자가 아닙니다.' }));

    expect(result.current.missing).toBe(true);
    expect(toast.show).toHaveBeenCalledTimes(1);
    expect(toast.show).toHaveBeenCalledWith('방에서 나왔어요.', 'info');
  });

  it('떠난 플레이어도 마지막으로 본 닉네임으로 부른다', async () => {
    const withMembers = (ids: number[]): Room => ({
      ...room('방'),
      members: ids.map((id) => ({ id, nickname: `플레이어${id}`, host: id === 1, connected: true, offlineSeconds: 0 })),
    });
    vi.spyOn(roomsApi, 'get').mockResolvedValue(withMembers([1, 2]));
    const { result } = renderHook(() => useRoomChannel('ABCDEF'));
    await act(async () => {});

    act(() => state.handlers.get('/topic/rooms/ABCDEF')?.(withMembers([1])));

    expect(result.current.nicknameOf(2)).toBe('플레이어2');
    expect(result.current.nicknameOf(99)).toBe('떠난 플레이어');
  });

  it('동기화 요청 직후 받은 화면은 animate=false, 이후 푸시는 animate=true', async () => {
    vi.spyOn(roomsApi, 'get').mockResolvedValue(room('방', 'PLAYING'));
    state.connected = true;
    const { result } = renderHook(() => useRoomChannel('ABCDEF'));
    await act(async () => {});
    expect(state.publish).toHaveBeenCalledWith('/app/rooms/ABCDEF/sync', {});

    act(() => state.handlers.get('/user/queue/game')?.(sessionView(1)));
    expect(result.current.transition?.animate).toBe(false);

    act(() => state.handlers.get('/user/queue/game')?.(sessionView(2)));
    expect(result.current.transition?.animate).toBe(true);
    expect(result.current.transition?.from?.roundNumber).toBe(1);
    expect(result.current.transition?.to.roundNumber).toBe(2);
  });

  it('관전 중 확인(poll)에서 404면 missing이 되고, 다른 실패는 조용히 넘긴다', async () => {
    vi.useFakeTimers();
    try {
      const get = vi.spyOn(roomsApi, 'get').mockResolvedValue(room('방', 'PLAYING'));
      const { result } = renderHook(() => useRoomChannel('ABCDEF', { poll: true }));
      await act(async () => {});
      expect(get).toHaveBeenCalledTimes(1);
      toast.show.mockClear();

      get.mockRejectedValueOnce(new Error('network'));
      await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
      expect(get).toHaveBeenCalledTimes(2);
      expect(result.current.missing).toBe(false);
      expect(toast.show).not.toHaveBeenCalled();

      get.mockRejectedValueOnce(new ApiError(404, 'ROOM_NOT_FOUND', '방을 찾을 수 없어요.'));
      await act(async () => { await vi.advanceTimersByTimeAsync(5000); });

      expect(result.current.missing).toBe(true);
      expect(toast.show).toHaveBeenCalledWith('방을 찾을 수 없어요.');
    } finally {
      vi.useRealTimers();
    }
  });

  it('poll이 아니면 주기적으로 다시 가져오지 않는다', async () => {
    vi.useFakeTimers();
    try {
      const get = vi.spyOn(roomsApi, 'get').mockResolvedValue(room('방'));
      renderHook(() => useRoomChannel('ABCDEF'));
      await act(async () => {});

      await act(async () => { await vi.advanceTimersByTimeAsync(15000); });

      expect(get).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('동기화 오류가 ROOM_NOT_FOUND면 missing이 된다', async () => {
    vi.spyOn(roomsApi, 'get').mockResolvedValue(room('방', 'PLAYING'));
    const { result } = renderHook(() => useRoomChannel('ABCDEF'));
    await act(async () => {});

    act(() => state.handlers.get('/user/queue/errors')?.({ status: 404, code: 'ROOM_NOT_FOUND', message: '방을 찾을 수 없어요.' }));

    expect(result.current.missing).toBe(true);
  });
});
