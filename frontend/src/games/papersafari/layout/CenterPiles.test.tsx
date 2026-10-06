import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CenterPiles } from './CenterPiles';

function renderPiles(drawable: boolean) {
  render(<CenterPiles deckSize={30} discardTop={{ kind: 'NUMBER', value: 3 }} drawable={drawable} onDrawDeck={vi.fn()} onDrawDiscard={vi.fn()} size="md" />);
  return screen.getByRole('button', { name: '덱에서 뽑기' });
}

describe('CenterPiles 덱', () => {
  it('가져올 수 있으면 손가락 커서와 떠오르는 hover를 단다', () => {
    const deck = renderPiles(true);

    expect(deck).toHaveClass('cursor-pointer', 'hover:-translate-y-1.5');
    expect(deck).not.toHaveClass('cursor-default');
  });

  it('가져올 수 없으면 기본 커서다', () => {
    const deck = renderPiles(false);

    expect(deck).toHaveClass('cursor-default');
    expect(deck).not.toHaveClass('cursor-pointer');
  });
});
