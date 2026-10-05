import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaperSafariView } from '../../../api/types';
import type { ViewTransition } from '../../../room/useRoomChannel';
import { TRAVEL_MS, useCardMotion } from './useCardMotion';

function game(round: number, held: PaperSafariView['round']['held'], phase: PaperSafariView['round']['phase'] = 'DRAW'): PaperSafariView {
  const slots = [0, 1, 2].flatMap((column) => [0, 1].map((row) => ({ column, row, faceUp: false, known: false, card: null })));
  return {
    viewerId: 1, status: 'IN_ROUND', roundNumber: round, tokens: {}, lastRoundResult: null, winnerId: null,
    round: { phase, currentPlayerId: 1, deckSize: 30, discardTop: { kind: 'NUMBER', value: 4 }, held,
      boards: [{ playerId: 1, slots }, { playerId: 2, slots }] },
  };
}

const drawn = (seq: number, animate = true): ViewTransition => ({
  seq, animate, from: game(1, null), to: game(1, { playerId: 2, source: 'DECK', card: null }, 'PLACE'),
});

function container(): HTMLElement {
  const root = document.createElement('div');
  ['deck', 'discard', 'hand:2', 'hand:1'].forEach((key) => {
    const el = document.createElement('div');
    el.dataset.zone = key;
    root.appendChild(el);
  });
  document.body.appendChild(root);
  return root;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useCardMotion', () => {
  it('덱에서 뽑으면 유령 카드를 띄우고 도착 칸을 잠시 숨긴다', () => {
    const ref = { current: container() };
    const { result } = renderHook(({ t }) => useCardMotion(ref, t), { initialProps: { t: drawn(1) } });

    expect(result.current.ghosts).toHaveLength(1);
    expect(result.current.hidden.has('hand:2')).toBe(true);

    act(() => vi.advanceTimersByTime(TRAVEL_MS + 50));

    expect(result.current.ghosts).toHaveLength(0);
    expect(result.current.hidden.size).toBe(0);
  });

  it('움직이는 중에 새 상태가 오면 이전 숨김을 모두 풀고 새로 시작한다', () => {
    const ref = { current: container() };
    const { result, rerender } = renderHook(({ t }) => useCardMotion(ref, t), { initialProps: { t: drawn(1) } });

    rerender({ t: { seq: 2, animate: true, from: drawn(1).to, to: drawn(1).to } });

    expect(result.current.ghosts).toHaveLength(0);
    expect(result.current.hidden.size).toBe(0);
  });

  it('animate=false면 나눠 주기 말고는 움직이지 않는다', () => {
    const ref = { current: container() };
    const transition = drawn(1, false);
    const { result } = renderHook(() => useCardMotion(ref, transition));

    expect(result.current.ghosts).toHaveLength(0);
    expect(result.current.hidden.size).toBe(0);
  });

  it('언마운트되면 남은 타이머를 정리한다', () => {
    const ref = { current: container() };
    const transition = drawn(1);
    const { unmount } = renderHook(() => useCardMotion(ref, transition));

    unmount();

    expect(() => vi.runAllTimers()).not.toThrow();
  });

  it('위치를 모르는 영역이면 유령 없이 넘어간다', () => {
    const ref = { current: document.createElement('div') };
    const transition = drawn(1);
    const { result } = renderHook(() => useCardMotion(ref, transition));

    expect(result.current.ghosts).toHaveLength(0);
    expect(result.current.hidden.size).toBe(0);
  });
});
