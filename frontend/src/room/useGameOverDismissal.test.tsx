import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { PaperSafariView } from '../api/types';
import { gameOverKey } from '../lib/dismissals';
import { useGameOverDismissal } from './useGameOverDismissal';

const over = { status: 'GAME_OVER', winnerId: 2, lastRoundResult: { players: [{ playerId: 1, score: 9, outcome: 'LOSE' }, { playerId: 2, score: 3, outcome: 'WIN' }] } } as unknown as PaperSafariView;

afterEach(() => window.sessionStorage.clear());

describe('useGameOverDismissal', () => {
  it('닫은 결과는 방에 다시 들어와도(다시 마운트해도) 닫힌 채로 있다', () => {
    const first = renderHook(() => useGameOverDismissal('ABC234', gameOverKey('ABC234', over), false));
    expect(first.result.current.dismissed).toBe(false);

    act(() => first.result.current.dismiss());
    expect(first.result.current.dismissed).toBe(true);
    first.unmount();

    const second = renderHook(() => useGameOverDismissal('ABC234', gameOverKey('ABC234', over), false));
    expect(second.result.current.dismissed).toBe(true);
  });

  it('다른 게임 결과는 닫히지 않은 것으로 본다', () => {
    const first = renderHook(() => useGameOverDismissal('ABC234', gameOverKey('ABC234', over), false));
    act(() => first.result.current.dismiss());

    const next = { ...over, lastRoundResult: { players: [{ playerId: 1, score: 2, outcome: 'WIN' }, { playerId: 2, score: 8, outcome: 'LOSE' }] }, winnerId: 1 } as PaperSafariView;
    const second = renderHook(() => useGameOverDismissal('ABC234', gameOverKey('ABC234', next), false));

    expect(second.result.current.dismissed).toBe(false);
  });

  it('게임 화면이 없으면 닫힌 것이 아니다', () => {
    const { result } = renderHook(() => useGameOverDismissal('ABC234', null, false));

    expect(result.current.dismissed).toBe(false);
  });

  it('방이 다시 게임 중이 되면 승자·점수가 같은 결과도 다시 닫히지 않은 것으로 본다', () => {
    const hook = renderHook(({ playing }) => useGameOverDismissal('ABC234', gameOverKey('ABC234', over), playing), { initialProps: { playing: false } });
    act(() => hook.result.current.dismiss());
    expect(hook.result.current.dismissed).toBe(true);

    hook.rerender({ playing: true });
    hook.rerender({ playing: false });

    expect(hook.result.current.dismissed).toBe(false);
  });
});
