import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SeatPicker, seatOptions } from './SeatPicker';

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

  it('options로 받은 인원 칸만 보여 준다', () => {
    render(<SeatPicker value={3} onChange={vi.fn()} options={[2, 3]} />);

    expect(screen.getAllByRole('radio').map((radio) => radio.textContent)).toEqual(['2', '3']);
  });

  it('게임의 최소~최대 인원으로 칸을 만든다', () => {
    expect(seatOptions(2, 5)).toEqual([2, 3, 4, 5]);
  });
});
