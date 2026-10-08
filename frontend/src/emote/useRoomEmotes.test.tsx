import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EMOTE_BUBBLE_MS, EMOTE_COOLDOWN_MS, useRoomEmotes } from './useRoomEmotes';

type Handler = (body: unknown) => void;
const state = vi.hoisted(() => ({
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
  return { useRealtime: () => ({ realtime: state.realtime, connected: true }) };
});

const toast = vi.hoisted(() => ({ show: vi.fn() }));
vi.mock('../components/Toast', () => ({ useToast: () => toast }));

const push = (body: unknown) => act(() => state.handlers.get('/user/queue/emote')?.(body));

beforeEach(() => {
  vi.useFakeTimers();
  state.handlers.clear();
  state.publish.mockReset().mockReturnValue(true);
  toast.show.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useRoomEmotes', () => {
  it('이 방으로 온 표정만 그 사람 말풍선으로 띄우고 2.5초 뒤 지운다', () => {
    const { result } = renderHook(() => useRoomEmotes('abc234', true));

    push({ roomCode: 'ABC234', id: 1, memberId: 2, emote: 'WINK' });
    push({ roomCode: 'ZZZ999', id: 2, memberId: 3, emote: 'SMILE' });
    push({ roomCode: 'ABC234', id: 3, memberId: 4, emote: 'DANCE' });

    expect(result.current.bubbles.get(2)).toEqual({ key: 1, emote: 'WINK' });
    expect(result.current.bubbles.has(3)).toBe(false);
    expect(result.current.bubbles.has(4)).toBe(false);

    act(() => vi.advanceTimersByTime(EMOTE_BUBBLE_MS - 1));
    expect(result.current.bubbles.has(2)).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.bubbles.has(2)).toBe(false);
  });

  it('같은 사람이 새로 보내면 말풍선을 바꾸고 시간을 처음부터 다시 센다', () => {
    const { result } = renderHook(() => useRoomEmotes('ABC234', true));
    push({ roomCode: 'ABC234', id: 1, memberId: 2, emote: 'WINK' });
    act(() => vi.advanceTimersByTime(2000));

    push({ roomCode: 'ABC234', id: 2, memberId: 2, emote: 'CRY' });
    act(() => vi.advanceTimersByTime(2000));

    expect(result.current.bubbles.get(2)).toEqual({ key: 2, emote: 'CRY' });
    act(() => vi.advanceTimersByTime(EMOTE_BUBBLE_MS - 2000));
    expect(result.current.bubbles.has(2)).toBe(false);
  });

  it('보내면 1초 동안 잠가 두 번째는 보내지 않는다', () => {
    const { result } = renderHook(() => useRoomEmotes('ABC234', true));

    let first = false;
    let second = true;
    act(() => {
      first = result.current.send('SMILE');
    });
    act(() => {
      second = result.current.send('CRY');
    });

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(result.current.coolingDown).toBe(true);
    expect(state.publish).toHaveBeenCalledTimes(1);
    expect(state.publish).toHaveBeenCalledWith('/app/rooms/ABC234/emote', { emote: 'SMILE' });

    act(() => vi.advanceTimersByTime(EMOTE_COOLDOWN_MS));
    expect(result.current.coolingDown).toBe(false);
    act(() => {
      result.current.send('CRY');
    });
    expect(state.publish).toHaveBeenCalledTimes(2);
  });

  it('연결이 끊겨 보내지 못하면 알리고 잠그지 않는다', () => {
    state.publish.mockReturnValue(false);
    const { result } = renderHook(() => useRoomEmotes('ABC234', true));

    act(() => {
      result.current.send('SMILE');
    });

    expect(toast.show).toHaveBeenCalledWith('연결이 끊겨 있어요. 잠시 후 다시 시도해 주세요.');
    expect(result.current.coolingDown).toBe(false);
  });

  it('꺼져 있으면 구독하지 않는다', () => {
    renderHook(() => useRoomEmotes('ABC234', false));

    expect(state.handlers.has('/user/queue/emote')).toBe(false);
  });
});
