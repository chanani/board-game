import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useGameFocus } from './useGameFocus';

function Probe({ active }: { active: boolean }) {
  useGameFocus(active);
  return null;
}

describe('useGameFocus', () => {
  const focus = () => document.documentElement.dataset.gameFocus;

  it('켜져 있는 동안만 html에 data-game-focus를 단다', () => {
    const { rerender, unmount } = render(<Probe active={false} />);
    expect(focus()).toBeUndefined();

    rerender(<Probe active />);
    expect(focus()).toBe('on');

    rerender(<Probe active={false} />);
    expect(focus()).toBeUndefined();

    rerender(<Probe active />);
    unmount();
    expect(focus()).toBeUndefined();
  });
});
