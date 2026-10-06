import type { UnoView } from '../../../api/types';
import type { ViewTransition } from '../../gameModule';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SILENT_SOUND, SoundContext } from '../../../lib/sound';
import { num, unoEvent, unoView } from '../unoFixtures';
import { useUnoMotion } from './useUnoMotion';

const reduced = vi.hoisted(() => ({ value: false }));
vi.mock('motion/react', async (importOriginal) => ({ ...(await importOriginal<typeof import('motion/react')>()), useReducedMotion: () => reduced.value }));

afterEach(() => {
  vi.useRealTimers();
  reduced.value = false;
});

function zone(root: HTMLElement, name: string, x: number) {
  const el = document.createElement('div');
  el.setAttribute('data-uno-zone', name);
  el.getBoundingClientRect = () => ({ x, y: 0, left: x, top: 0, width: 50, height: 70, right: x + 50, bottom: 70, toJSON: () => ({}) });
  root.appendChild(el);
}

function run(play = vi.fn()) {
  const root = document.createElement('div');
  zone(root, 'hand:2', 0);
  zone(root, 'discard', 200);
  const from = unoView({ events: [unoEvent(4, 'DRAW', { actorId: 3, count: 1 })] });
  const to = unoView({ events: [...from.events, unoEvent(5, 'PLAY', { actorId: 2, card: num('RED', 7, 13) })] });
  const wrapper = ({ children }: { children: ReactNode }) => <SoundContext.Provider value={{ ...SILENT_SOUND, play }}>{children}</SoundContext.Provider>;
  vi.useFakeTimers();
  const hook = renderHook(() => useUnoMotion({ current: root }, { seq: 2, from, to, animate: true }, 1, 64), { wrapper });
  return { ...hook, play };
}

describe('useUnoMotion', () => {
  it('카드를 내면 고정 카드 폭의 고스트 하나를 만든다', () => {
    const { result } = run();

    expect(result.current.ghosts).toHaveLength(1);
    expect(result.current.ghosts[0].width).toBe(64);
  });

  it('동작 줄이기여도 소리는 내고 고스트는 만들지 않는다', () => {
    reduced.value = true;
    const { result, play } = run();
    vi.advanceTimersByTime(10);

    expect(result.current.ghosts).toEqual([]);
    expect(play).toHaveBeenCalledWith('place');
  });

  it('손패가 비어 잴 수 없어도 마지막으로 잰 자리에서 마지막 카드가 날아간다', () => {
    const root = document.createElement('div');
    zone(root, 'hand:2', 0);
    zone(root, 'discard', 200);
    const from = unoView({ events: [unoEvent(4, 'DRAW', { actorId: 3, count: 1 })] });
    const to = unoView({ events: [...from.events, unoEvent(5, 'PLAY', { actorId: 2, card: num('RED', 7, 13) })] });
    const first: ViewTransition<UnoView> = { seq: 1, from: null, to: from, animate: false };
    const second: ViewTransition<UnoView> = { seq: 2, from, to, animate: true };
    const { result, rerender } = renderHook(({ t }) => useUnoMotion({ current: root }, t, 1, 64), { initialProps: { t: first } });

    root.querySelector<HTMLElement>('[data-uno-zone="hand:2"]')!.getBoundingClientRect = () => ({ x: 0, y: 0, left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0, toJSON: () => ({}) });
    rerender({ t: second });

    expect(result.current.ghosts).toHaveLength(1);
  });
});
