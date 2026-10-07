import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useFinalePhase } from './useFinalePhase';

type G = { status: string };

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
});
