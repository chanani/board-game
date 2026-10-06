import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CreateRoomModal } from './CreateRoomModal';

describe('CreateRoomModal', () => {
  it('비공개방을 켜면 비밀번호 칸이 나타나고 입력값으로 만든다', async () => {
    const onCreate = vi.fn();
    render(<CreateRoomModal open defaultName="앨리스의 방" onClose={vi.fn()} onCreate={onCreate} />);
    expect(screen.queryByLabelText('비밀번호')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: '3' }));
    await userEvent.click(screen.getByRole('switch', { name: '비공개방' }));
    await userEvent.type(screen.getByLabelText('비밀번호'), '1234');
    await userEvent.click(screen.getByRole('button', { name: '만들기' }));

    expect(onCreate).toHaveBeenCalledWith('앨리스의 방', 3, '1234');
  });

  it('공개방이면 비밀번호 없이 만든다', async () => {
    const onCreate = vi.fn();
    render(<CreateRoomModal open defaultName="방" onClose={vi.fn()} onCreate={onCreate} />);

    await userEvent.click(screen.getByRole('button', { name: '만들기' }));

    expect(onCreate).toHaveBeenCalledWith('방', 5, undefined);
  });
});
