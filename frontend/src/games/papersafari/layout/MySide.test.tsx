import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MySide } from './MySide';

const props = { canDiscard: true, estimate: { score: 3, hidden: 2 }, onDiscard: vi.fn(), onUndo: vi.fn() };

describe('MySide', () => {
  it('되돌리기를 쓸 수 없을 때도 같은 높이의 빈 자리를 남겨, 카드를 가져와도 내 판 줄 높이가 바뀌지 않는다', () => {
    const { rerender } = render(<MySide {...props} canUndo={false} />);
    expect(screen.queryByRole('button', { name: '되돌리기' })).not.toBeInTheDocument();
    expect(screen.getByTestId('undo-slot')).toHaveClass('h-9');

    rerender(<MySide {...props} canUndo />);
    expect(screen.getByRole('button', { name: '되돌리기' })).toHaveClass('h-9');
    expect(screen.queryByTestId('undo-slot')).not.toBeInTheDocument();
  });
});
