import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePolling } from './usePolling';

describe('usePolling', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('바로 한 번, 그 뒤 간격마다 부른다', async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    renderHook(() => usePolling(fn, 1000));
    expect(fn).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(fn).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1000);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('이전 호출이 끝나지 않았으면 다음 차례를 건너뛴다', async () => {
    const fn = vi.fn().mockReturnValue(new Promise(() => undefined));
    renderHook(() => usePolling(fn, 1000));

    await vi.advanceTimersByTimeAsync(3000);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('사라지면 멈춘다', async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const { unmount } = renderHook(() => usePolling(fn, 1000));
    unmount();

    await vi.advanceTimersByTimeAsync(3000);

    expect(fn).toHaveBeenCalledTimes(1);
  });
});
