import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UnoEvent } from '../../api/types';
import { unoEvent } from './unoFixtures';
import { useSeatEffects } from './useSeatEffects';

afterEach(() => vi.useRealTimers());

describe('useSeatEffects', () => {
  it('처음 받은 이벤트에는 효과를 주지 않는다', () => {
    const { result } = renderHook(() => useSeatEffects([unoEvent(3, 'UNO_CALL', { actorId: 2 })]));

    expect(result.current[2]).toBeUndefined();
  });

  it('우노 외침 말풍선은 1.5초, 잡힘 흔들림은 0.6초, 건너뛰기 표시는 0.8초 뒤 사라진다', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ events }: { events: UnoEvent[] }) => useSeatEffects(events), { initialProps: { events: [] as UnoEvent[] } });

    rerender({ events: [unoEvent(5, 'UNO_CALL', { actorId: 2 }), unoEvent(6, 'UNO_CAUGHT', { actorId: 2, targetId: 3 }), unoEvent(7, 'SKIP', { targetId: 4 })] });

    expect(result.current[2].bubble).toBe(true);
    expect(result.current[3].shake).toBe(true);
    expect(result.current[4].skipped).toBe(true);
    act(() => { vi.advanceTimersByTime(800); });
    expect(result.current[3]?.shake ?? false).toBe(false);
    expect(result.current[4]?.skipped ?? false).toBe(false);
    expect(result.current[2].bubble).toBe(true);
    act(() => { vi.advanceTimersByTime(700); });
    expect(result.current[2]?.bubble ?? false).toBe(false);
  });
});
