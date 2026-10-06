import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { chatApi, type ChatMessage } from '../api/chat';
import { useRoomChat } from './useRoomChat';

type Handler = (body: unknown) => void;
const state = vi.hoisted(() => ({
  connected: true as boolean,
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
vi.mock('../api/chat', () => ({ chatApi: { history: vi.fn() } }));

const message = (id: number, memberId = 2, text = `안녕 ${id}`): ChatMessage => ({
  id, memberId, nickname: memberId === 1 ? '앨리스' : '밥', text, sentAt: '2026-10-06T00:00:00Z',
});
const push = (body: ChatMessage & { roomCode: string }) => act(() => state.handlers.get('/user/queue/chat')?.(body));

beforeEach(() => {
  state.connected = true;
  state.handlers.clear();
  state.publish.mockReset().mockReturnValue(true);
  toast.show.mockReset();
  vi.mocked(chatApi.history).mockReset().mockResolvedValue([message(1), message(2)]);
});

describe('useRoomChat', () => {
  it('기록을 한 번 불러온 뒤 이 방으로 온 새 메시지를 붙이고 같은 id는 한 번만 둔다', async () => {
    const { result } = renderHook(() => useRoomChat('ABC234', true, { meId: 1 }));
    await waitFor(() => expect(result.current.messages).toHaveLength(2));
    expect(chatApi.history).toHaveBeenCalledTimes(1);
    expect(chatApi.history).toHaveBeenCalledWith('ABC234');

    push({ ...message(3), roomCode: 'ABC234' });
    push({ ...message(3), roomCode: 'ABC234' });
    push({ ...message(4), roomCode: 'ZZZ999' });

    expect(result.current.messages.map((item) => item.id)).toEqual([1, 2, 3]);
    expect(result.current.messages[2].text).toBe('안녕 3');
  });

  it('꺼져 있으면 기록도 구독도 하지 않는다', () => {
    renderHook(() => useRoomChat('ABC234', false, { meId: 1 }));

    expect(chatApi.history).not.toHaveBeenCalled();
    expect(state.handlers.has('/user/queue/chat')).toBe(false);
  });

  it('send는 방 채팅 주소로 글을 보낸다', async () => {
    const { result } = renderHook(() => useRoomChat('ABC234', true, { meId: 1 }));
    await waitFor(() => expect(result.current.messages).toHaveLength(2));

    let sent = false;
    act(() => { sent = result.current.send('반가워요'); });

    expect(sent).toBe(true);
    expect(state.publish).toHaveBeenCalledWith('/app/rooms/ABC234/chat', { text: '반가워요' });
  });

  it('연결이 끊겨 보내지 못하면 false를 돌려주고 알린다', async () => {
    state.publish.mockReturnValue(false);
    const { result } = renderHook(() => useRoomChat('ABC234', true, { meId: 1 }));

    let sent = true;
    act(() => { sent = result.current.send('반가워요'); });

    expect(sent).toBe(false);
    expect(toast.show).toHaveBeenCalledWith('연결이 끊겨 있어요. 잠시 후 다시 시도해 주세요.');
  });

  it('기록 이후에 온 남의 메시지만 안 읽은 수로 세고 markRead로 지운다', async () => {
    const { result } = renderHook(() => useRoomChat('ABC234', true, { meId: 1 }));
    await waitFor(() => expect(result.current.messages).toHaveLength(2));
    expect(result.current.unread).toBe(0);

    push({ ...message(3, 2), roomCode: 'ABC234' });
    push({ ...message(4, 1), roomCode: 'ABC234' });
    expect(result.current.unread).toBe(1);

    act(() => result.current.markRead());
    expect(result.current.unread).toBe(0);
  });

  it('다시 연결돼 기록을 새로 불러와도 그사이 받은 메시지를 읽음으로 바꾸지 않는다', async () => {
    vi.mocked(chatApi.history).mockResolvedValue([]);
    const { result, rerender } = renderHook(() => useRoomChat('ABC234', true, { meId: 1 }));
    await waitFor(() => expect(chatApi.history).toHaveBeenCalledTimes(1));
    await act(async () => {});

    push({ ...message(3, 2), roomCode: 'ABC234' });
    expect(result.current.unread).toBe(1);

    vi.mocked(chatApi.history).mockResolvedValue([message(3, 2)]);
    state.connected = false;
    rerender();
    state.connected = true;
    rerender();
    await waitFor(() => expect(chatApi.history).toHaveBeenCalledTimes(2));
    await act(async () => {});

    expect(result.current.unread).toBe(1);
  });
  it('latest는 지금 받은 메시지만 알리고 기록 불러오기로는 바뀌지 않는다', async () => {
    const { result } = renderHook(() => useRoomChat('ABC234', true, { meId: 1 }));
    await waitFor(() => expect(result.current.messages).toHaveLength(2));
    expect(result.current.latest).toBeNull();

    push({ ...message(3, 2, '안녕하세요'), spectator: true, roomCode: 'ABC234' });

    expect(result.current.latest).toMatchObject({ id: 3, memberId: 2, text: '안녕하세요', spectator: true });
    push({ ...message(4, 2), roomCode: 'ZZZ999' });
    expect(result.current.latest?.id).toBe(3);
  });
});
