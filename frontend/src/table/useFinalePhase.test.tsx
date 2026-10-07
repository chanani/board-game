import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FINALE_DELAY_MS, useFinalePhase } from './useFinalePhase';

type G = { status: string };

afterEach(() => vi.useRealTimers());

describe('useFinalePhase', () => {
  it('게임 중이면 playing, 이미 끝난 화면이나 바로 끝내는 경우는 done', () => {
    const playing: G = { status: 'IN_PROGRESS' };
    const over: G = { status: 'GAME_OVER' };

    expect(renderHook(() => useFinalePhase(playing, null, false)).result.current).toBe('playing');
    expect(renderHook(() => useFinalePhase(over, null, false)).result.current).toBe('done');
    const live = { seq: 1, from: playing, to: over, animate: true };
    expect(renderHook(() => useFinalePhase(over, live, true)).result.current).toBe('done');
    expect(renderHook(() => useFinalePhase(over, live, false)).result.current).toBe('flying');
  });

  it('배너까지 기다리는 시간은 기본 450ms이고 게임이 더 길게 줄 수 있다', () => {
    vi.useFakeTimers();
    const playing: G = { status: 'IN_PROGRESS' };
    const over: G = { status: 'GAME_OVER' };
    const live = { seq: 1, from: playing, to: over, animate: true };
    const standard = renderHook(() => useFinalePhase(over, live, false));
    const longer = renderHook(() => useFinalePhase(over, live, false, 810));

    act(() => vi.advanceTimersByTime(FINALE_DELAY_MS));
    expect(standard.result.current).toBe('banner');
    expect(longer.result.current).toBe('flying');

    act(() => vi.advanceTimersByTime(810 - FINALE_DELAY_MS));
    expect(longer.result.current).toBe('banner');
  });
});
