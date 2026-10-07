import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SILENT_SOUND, SoundContext } from '../../../lib/sound';
import { CLEANUP_PAD_MS } from '../../../table/useGhostFlights';
import { card, oldMaidEvent, oldMaidView } from '../oldMaidFixtures';
import { DRAW_MS, PAIR_GAP_MS, PAIR_MS } from './planOldMaidMotion';
import { useOldMaidMotion } from './useOldMaidMotion';

afterEach(() => {
  vi.useRealTimers();
});

function zone(root: HTMLElement, name: string, x: number) {
  const el = document.createElement('div');
  el.setAttribute('data-oldmaid-zone', name);
  el.getBoundingClientRect = () => ({ x, y: 0, left: x, top: 0, width: 50, height: 70, right: x + 50, bottom: 70, toJSON: () => ({}) });
  root.appendChild(el);
}

describe('useOldMaidMotion', () => {
  it('뽑은 카드 고스트는 내려앉자마자 사라져 짝이 버린 더미로 날아가는 동안 뒷면이 남지 않는다', () => {
    const root = document.createElement('div');
    zone(root, 'target', 0);
    zone(root, 'hand:3', 100);
    zone(root, 'discard', 200);
    const from = oldMaidView({ events: [oldMaidEvent(3, 'SHUFFLE', { actorId: 3 })] });
    const to = oldMaidView({ events: [
      oldMaidEvent(4, 'DRAW', { actorId: 3, targetId: 2, count: 1 }),
      oldMaidEvent(5, 'PAIR', { actorId: 3, cards: [card('SPADES', 'NINE'), card('HEARTS', 'NINE')] }),
    ] });
    const wrapper = ({ children }: { children: ReactNode }) => <SoundContext.Provider value={SILENT_SOUND}>{children}</SoundContext.Provider>;
    vi.useFakeTimers();
    const { result } = renderHook(() => useOldMaidMotion({ current: root }, { seq: 1, from, to, animate: true }, 1, 40), { wrapper });

    expect(result.current.ghosts.map((ghost) => ghost.card)).toEqual([null, card('SPADES', 'NINE'), card('HEARTS', 'NINE')]);
    // 비행이 끝나는 순간에는 아직 남아 마지막 프레임이 자리에 닿고, 여유 시간 뒤에 지워진다.
    act(() => vi.advanceTimersByTime(DRAW_MS));
    expect(result.current.ghosts).toHaveLength(3);
    act(() => vi.advanceTimersByTime(CLEANUP_PAD_MS));
    expect(result.current.ghosts.map((ghost) => ghost.card)).toEqual([card('SPADES', 'NINE'), card('HEARTS', 'NINE')]);
    act(() => vi.advanceTimersByTime(PAIR_MS));
    expect(result.current.ghosts.map((ghost) => ghost.card)).toEqual([card('HEARTS', 'NINE')]);
    act(() => vi.advanceTimersByTime(PAIR_GAP_MS));
    expect(result.current.ghosts).toEqual([]);
  });
});
