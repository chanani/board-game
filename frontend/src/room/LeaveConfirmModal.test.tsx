import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LeaveConfirmModal } from './LeaveConfirmModal';

describe('LeaveConfirmModal', () => {
  it('취소와 나가기가 각각 콜백을 부르고, 기권이라는 말은 쓰지 않는다', async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(<LeaveConfirmModal open onCancel={onCancel} onConfirm={onConfirm} />);

    const dialog = screen.getByRole('dialog', { name: '정말 나갈까요?' });
    expect(dialog).not.toHaveTextContent('기권');
    await userEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(onCancel).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: '나가기' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('닫혀 있으면 아무것도 그리지 않는다', () => {
    render(<LeaveConfirmModal open={false} onCancel={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
