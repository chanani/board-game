import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectivePeek, PEEK_THROTTLE_MS, usePeekSender } from './usePeek';
import { oldMaidView, peekSignal } from './oldMaidFixtures';

afterEach(() => vi.useRealTimers());

describe('effectivePeek', () => {
  it('D16 화면 peek과 신호 중 이 차례의 seq가 큰 쪽을 쓴다', () => {
    const game = oldMaidView({ peek: { index: 1, seq: 3 } });

    expect(effectivePeek(game, null)).toBe(1);
    expect(effectivePeek(game, peekSignal({ index: 2, seq: 4 }))).toBe(2);
    expect(effectivePeek(game, peekSignal({ index: 2, seq: 3 }))).toBe(1);
    expect(effectivePeek(game, peekSignal({ index: null, seq: 9 }))).toBeNull();
  });

  it('이전 차례·다른 판의 신호는 무시하고 끝난 게임은 들림이 없다', () => {
    const game = oldMaidView({ turnSeq: 5, peek: { index: null, seq: 2 } });

    expect(effectivePeek(game, peekSignal({ turnSeq: 4, index: 0, seq: 9 }))).toBeNull();
    expect(effectivePeek(game, peekSignal({ turnSeq: 5, startedAt: 999, index: 0, seq: 9 }))).toBeNull();
    expect(effectivePeek(oldMaidView({ status: 'GAME_OVER', peek: null }), peekSignal({ index: 0, seq: 9 }))).toBeNull();
  });
});

describe('usePeekSender', () => {
  it('첫 신호는 바로, 100ms 안의 신호는 마지막 것만 뒤에 보내고 같은 자리는 다시 보내지 않는다', () => {
    vi.useFakeTimers();
    const send = vi.fn();
    const { result } = renderHook(() => usePeekSender(send, '1000:1'));

    act(() => result.current(1));
    act(() => result.current(2));
    act(() => result.current(3));
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenLastCalledWith({ type: 'PEEK', index: 1 });

    act(() => vi.advanceTimersByTime(PEEK_THROTTLE_MS));
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenLastCalledWith({ type: 'PEEK', index: 3 });

    act(() => vi.advanceTimersByTime(PEEK_THROTTLE_MS));
    act(() => result.current(3));
    expect(send).toHaveBeenCalledTimes(2);
    act(() => result.current(null));
    expect(send).toHaveBeenLastCalledWith({ type: 'PEEK', index: null });
  });

  it('처음의 "고르지 않음"은 보내지 않고, 차례가 바뀌면 기억을 지운다', () => {
    vi.useFakeTimers();
    const send = vi.fn();
    const { result, rerender } = renderHook(({ turnKey }) => usePeekSender(send, turnKey), { initialProps: { turnKey: '1000:1' } });

    act(() => result.current(null));
    expect(send).not.toHaveBeenCalled();
    act(() => result.current(2));
    rerender({ turnKey: '1000:2' });
    act(() => vi.advanceTimersByTime(PEEK_THROTTLE_MS));
    act(() => result.current(2));

    expect(send).toHaveBeenCalledTimes(2);
  });

  it('들자마자 고르기를 풀면 간격이 지난 뒤 null을 꼭 보낸다(서버가 50ms 안 신호를 버려도 마지막 상태가 닿는다)', () => {
    vi.useFakeTimers();
    const send = vi.fn();
    const { result } = renderHook(() => usePeekSender(send, '1000:1'));

    act(() => result.current(1));
    act(() => vi.advanceTimersByTime(30));
    act(() => result.current(null));
    expect(send).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(PEEK_THROTTLE_MS));
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenLastCalledWith({ type: 'PEEK', index: null });
  });
  it('같은 차례에서 서버가 들림을 지우면(상대 그대로 다시 정하기) 같은 자리도 다시 보낸다', () => {
    vi.useFakeTimers();
    const send = vi.fn();
    const { result, rerender } = renderHook(({ clearedSeq }) => usePeekSender(send, '1000:1', clearedSeq), {
      initialProps: { clearedSeq: 0 as number | null },
    });

    act(() => result.current(2));
    rerender({ clearedSeq: null });
    rerender({ clearedSeq: 4 });
    act(() => vi.advanceTimersByTime(PEEK_THROTTLE_MS));
    act(() => result.current(2));

    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenLastCalledWith({ type: 'PEEK', index: 2 });
  });
});
