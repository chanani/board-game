import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { setMediaMatches } from '../test/media';
import { PC_QUERY, useMediaQuery } from './useMediaQuery';

describe('useMediaQuery', () => {
  it('현재 일치 여부를 돌려주고 바뀌면 다시 그린다', () => {
    const { result } = renderHook(() => useMediaQuery(PC_QUERY));
    expect(result.current).toBe(true);

    act(() => setMediaMatches(false));

    expect(result.current).toBe(false);
  });
});
