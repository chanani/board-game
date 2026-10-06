import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { KickBadge } from './KickBadge';

describe('KickBadge', () => {
  it('키보드 포커스가 안쪽 동그라미에 보인다', () => {
    render(<KickBadge label="앨리스 내보내기" onClick={() => {}} />);
    const button = screen.getByRole('button', { name: '앨리스 내보내기' });
    expect(button).toHaveClass('group', 'outline-none');
    expect(button.firstElementChild).toHaveClass('group-focus-visible:ring-2');
  });
});
