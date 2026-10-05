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

type Box = { x: number; y: number; width: number; height: number };
const CARD: Box = { x: 0, y: 0, width: 64, height: 90 };

function stubRect(el: HTMLElement, box: Box) {
  el.getBoundingClientRect = () => ({
    ...box, left: box.x, top: box.y, right: box.x + box.width, bottom: box.y + box.height, toJSON: () => box,
  }) as DOMRect;
}

function container(rects: Record<string, Box> = {}): HTMLElement {
  const root = document.createElement('div');
  ['deck', 'discard', 'hand:2', 'hand:1'].forEach((key) => {
    const el = document.createElement('div');
    el.dataset.zone = key;
    stubRect(el, rects[key] ?? CARD);
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

  it('한쪽 영역의 높이가 0이면 다른 쪽 크기로 그 중심에서 날아간다', () => {
    const ref = { current: container({ 'hand:2': { x: 200, y: 100, width: 48, height: 0 } }) };
    const transition = drawn(1);
    const { result } = renderHook(() => useCardMotion(ref, transition));

    expect(result.current.ghosts).toHaveLength(1);
    expect(result.current.ghosts[0].from).toEqual(CARD);
    expect(result.current.ghosts[0].to).toEqual({ x: 192, y: 55, width: 64, height: 90 });
  });

  it('양쪽 영역 모두 크기가 없으면 유령도 숨김도 없다', () => {
    const empty = { x: 10, y: 10, width: 0, height: 0 };
    const ref = { current: container({ deck: empty, 'hand:2': { ...empty, width: 48 } }) };
    const transition = drawn(1);
    const { result } = renderHook(() => useCardMotion(ref, transition));

    expect(result.current.ghosts).toHaveLength(0);
    expect(result.current.hidden.size).toBe(0);
  });
});
