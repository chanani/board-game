import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PasswordModal } from './PasswordModal';

describe('PasswordModal', () => {
  it('입력한 비밀번호를 넘긴다', async () => {
    const onSubmit = vi.fn();
    render(<PasswordModal open roomName="내 방" error={null} onSubmit={onSubmit} onCancel={vi.fn()} />);

    const dialog = screen.getByRole('dialog', { name: '내 방 비밀번호' });
    expect(dialog).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('비밀번호'), '1234');
    await userEvent.click(screen.getByRole('button', { name: '들어가기' }));

    expect(onSubmit).toHaveBeenCalledWith('1234');
  });

  it('오류 문구를 보여주고 취소할 수 있다', async () => {
    const onCancel = vi.fn();
    render(<PasswordModal open roomName="내 방" error="비밀번호가 맞지 않아요." onSubmit={vi.fn()} onCancel={onCancel} />);

    expect(screen.getByRole('alert')).toHaveTextContent('비밀번호가 맞지 않아요.');
    await userEvent.click(screen.getByRole('button', { name: '취소' }));

    expect(onCancel).toHaveBeenCalled();
  });
});
