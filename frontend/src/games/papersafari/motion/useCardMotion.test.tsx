import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaperSafariView } from '../../../api/types';
import type { ViewTransition } from '../../../room/useRoomChannel';
import { LIFT_MS, TRAVEL_MS, useCardMotion } from './useCardMotion';

const reducedMotion = vi.hoisted(() => ({ value: false }));
vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('motion/react')>()),
  useReducedMotion: () => reducedMotion.value,
}));

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
  ['deck', 'discard', 'hand:2', 'hand:1', ...[1, 2].flatMap((p) => [0, 1, 2].flatMap((c) => [0, 1].map((r) => `slot:${p}:${c}:${r}`)))].forEach((key) => {
    const el = document.createElement('div');
    el.dataset.zone = key;
    stubRect(el, rects[key] ?? CARD);
    root.appendChild(el);
  });
  document.body.appendChild(root);
  return root;
}

beforeEach(() => { reducedMotion.value = false; vi.useFakeTimers(); });
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

  it('언마운트되면 남은 타이머를 모두 정리한다', () => {
    const ref = { current: container() };
    const transition = drawn(1);
    const clearSpy = vi.spyOn(window, 'clearTimeout');
    const { result, unmount } = renderHook(() => useCardMotion(ref, transition));
    expect(result.current.ghosts).toHaveLength(1);
    const before = clearSpy.mock.calls.length;

    unmount();

    expect(clearSpy.mock.calls.length).toBeGreaterThan(before);
    expect(vi.getTimerCount()).toBe(0);
    clearSpy.mockRestore();
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

  it('엿보기를 하면 그 칸이 0.8초 동안 들렸다가 내려온다', () => {
    const ref = { current: container() };
    const from = game(1, null, 'PEEK');
    const to = game(1, null, 'DRAW');
    to.round.boards = to.round.boards.map((board) => (board.playerId !== 1 ? board
      : { ...board, slots: board.slots.map((slot) => (slot.column === 0 && slot.row === 0 ? { ...slot, known: true, card: { kind: 'NUMBER' as const, value: 3 } } : slot)) }));
    const transition: ViewTransition = { seq: 1, animate: true, from, to };
    const { result } = renderHook(() => useCardMotion(ref, transition));

    expect(result.current.lifted.has('slot:1:0:0')).toBe(true);

    act(() => vi.advanceTimersByTime(LIFT_MS + 10));

    expect(result.current.lifted.size).toBe(0);
  });

  it('서버 오류가 오면 진행 중인 연출을 바로 끝낸다', () => {
    const ref = { current: container() };
    const transition = drawn(1);
    const { result, rerender } = renderHook(({ key }) => useCardMotion(ref, transition, key), { initialProps: { key: 0 } });
    expect(result.current.ghosts).toHaveLength(1);

    rerender({ key: 1 });

    expect(result.current.ghosts).toHaveLength(0);
    expect(result.current.hidden.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  describe('동작 줄이기', () => {
    const deal: ViewTransition = {
      seq: 1, animate: false, from: null as unknown as PaperSafariView,
      to: game(1, null, 'SETUP_FLIP'),
    };

    it('끄면 나눠 주기 카드가 날아간다', () => {
      const ref = { current: container() };
      const { result } = renderHook(() => useCardMotion(ref, deal));

      expect(result.current.ghosts.length).toBeGreaterThan(0);
    });

    it('켜면 나눠 주기 유령도 숨김도 없다', () => {
      reducedMotion.value = true;
      const ref = { current: container() };
      const { result } = renderHook(() => useCardMotion(ref, deal));

      expect(result.current.ghosts).toHaveLength(0);
      expect(result.current.hidden.size).toBe(0);
    });
  });
});
