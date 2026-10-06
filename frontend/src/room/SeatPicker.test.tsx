import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SeatPicker } from './SeatPicker';

describe('SeatPicker', () => {
  it('min보다 작은 칸은 비활성이고 눌러도 고르지 않는다', async () => {
    const onChange = vi.fn();
    render(<SeatPicker value={4} onChange={onChange} min={3} />);
    const two = screen.getByRole('radio', { name: '2' });
    expect(two).toBeDisabled();
    await userEvent.click(two);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('화살표로 옮길 때 비활성 칸은 건너뛴다', async () => {
    const onChange = vi.fn();
    render(<SeatPicker value={3} onChange={onChange} min={3} />);
    screen.getByRole('radio', { name: '3' }).focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenLastCalledWith(5);
  });
});
