import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { PaperSafariView } from '../api/types';
import { useGameOverDismissal } from './useGameOverDismissal';

const over = { status: 'GAME_OVER', winnerId: 2, tokens: { '1': 1, '2': 3 } } as unknown as PaperSafariView;

afterEach(() => window.sessionStorage.clear());

describe('useGameOverDismissal', () => {
  it('닫은 결과는 방에 다시 들어와도(다시 마운트해도) 닫힌 채로 있다', () => {
    const first = renderHook(() => useGameOverDismissal('ABC234', over));
    expect(first.result.current.dismissed).toBe(false);

    act(() => first.result.current.dismiss());
    expect(first.result.current.dismissed).toBe(true);
    first.unmount();

    const second = renderHook(() => useGameOverDismissal('ABC234', over));
    expect(second.result.current.dismissed).toBe(true);
  });

  it('다른 게임 결과는 닫히지 않은 것으로 본다', () => {
    const first = renderHook(() => useGameOverDismissal('ABC234', over));
    act(() => first.result.current.dismiss());

    const next = { ...over, tokens: { '1': 3, '2': 2 }, winnerId: 1 } as PaperSafariView;
    const second = renderHook(() => useGameOverDismissal('ABC234', next));

    expect(second.result.current.dismissed).toBe(false);
  });

  it('게임 화면이 없으면 닫힌 것이 아니다', () => {
    const { result } = renderHook(() => useGameOverDismissal('ABC234', null));

    expect(result.current.dismissed).toBe(false);
  });
});
