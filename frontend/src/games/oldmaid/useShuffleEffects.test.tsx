import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { oldMaidEvent } from './oldMaidFixtures';
import { SHUFFLE_MS, useShuffleEffects } from './useShuffleEffects';

afterEach(() => vi.useRealTimers());

describe('useShuffleEffects', () => {
  it('새 섞기 이벤트의 사람을 600ms 동안 돌려준다(처음 화면은 제외)', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ events }) => useShuffleEffects(events), {
      initialProps: { events: [oldMaidEvent(1, 'SHUFFLE', { actorId: 2 })] },
    });
    expect(result.current.size).toBe(0);

    rerender({ events: [oldMaidEvent(2, 'SHUFFLE', { actorId: 3 })] });
    expect(result.current.has(3)).toBe(true);

    act(() => vi.advanceTimersByTime(SHUFFLE_MS));
    expect(result.current.has(3)).toBe(false);
  });
});
