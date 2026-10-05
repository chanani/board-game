import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { roomsApi } from '../api/rooms';
import type { Room } from '../api/types';
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
  maxPlayers: 4,
  members: [],
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
});
