import { render, screen, waitFor, within } from '@testing-library/react';
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

    expect(onCreate).toHaveBeenCalledWith('앨리스의 방', 3, 'WOOD', '1234');
  });

  it('공개방이면 비밀번호 없이 만든다', async () => {
    const onCreate = vi.fn();
    render(<CreateRoomModal open defaultName="방" onClose={vi.fn()} onCreate={onCreate} />);

    await userEvent.click(screen.getByRole('button', { name: '만들기' }));

    expect(onCreate).toHaveBeenCalledWith('방', 5, 'WOOD', undefined);
  });

  it('비공개인데 비밀번호가 비었거나 짧으면 만들지 않는다', async () => {
    const onCreate = vi.fn();
    render(<CreateRoomModal open defaultName="방" onClose={vi.fn()} onCreate={onCreate} />);
    await userEvent.click(screen.getByRole('switch', { name: '비공개방' }));

    await userEvent.click(screen.getByRole('button', { name: '만들기' }));
    await userEvent.type(screen.getByLabelText('비밀번호'), '12');
    await userEvent.click(screen.getByRole('button', { name: '만들기' }));

    expect(onCreate).not.toHaveBeenCalled();
  });

  it('방 이름은 앞뒤 공백을 지우고 공백뿐이면 만들지 않는다', async () => {
    const onCreate = vi.fn();
    render(<CreateRoomModal open defaultName="방" onClose={vi.fn()} onCreate={onCreate} />);
    const input = screen.getByLabelText('방 이름');

    await userEvent.clear(input);
    await userEvent.type(input, '   ');
    await userEvent.click(screen.getByRole('button', { name: '만들기' }));
    expect(onCreate).not.toHaveBeenCalled();
    await userEvent.type(input, ' 새방 ');
    await userEvent.click(screen.getByRole('button', { name: '만들기' }));

    expect(onCreate).toHaveBeenCalledWith('새방', 5, 'WOOD', undefined);
  });

  it('다시 열면 처음 값으로 돌아간다', async () => {
    const { rerender } = render(<CreateRoomModal open defaultName="방" onClose={vi.fn()} onCreate={vi.fn()} />);
    await userEvent.click(screen.getByRole('radio', { name: '3' }));
    await userEvent.click(screen.getByRole('switch', { name: '비공개방' }));

    rerender(<CreateRoomModal open={false} defaultName="방" onClose={vi.fn()} onCreate={vi.fn()} />);
    rerender(<CreateRoomModal open defaultName="방" onClose={vi.fn()} onCreate={vi.fn()} />);

    expect(screen.getByRole('radio', { name: '5' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: '비공개방' })).toHaveAttribute('aria-checked', 'false');
  });

  it('테마 5종을 미리보기 타일로 고르고 기본은 원목 라운지다', async () => {
    const onCreate = vi.fn();
    render(<CreateRoomModal open defaultName="방" onClose={vi.fn()} onCreate={onCreate} />);
    const group = screen.getByRole('radiogroup', { name: '테마' });
    const tiles = within(group).getAllByRole('radio');

    expect(tiles.map((tile) => tile.textContent)).toEqual(['원목 라운지', '사바나 노을', '달빛 정글', '설원 오로라', '열대 해변']);
    expect(within(group).getByRole('radio', { name: '원목 라운지' })).toHaveAttribute('aria-checked', 'true');
    expect(group.querySelector('[data-theme="BEACH"]')).not.toBeNull();

    await userEvent.click(within(group).getByRole('radio', { name: '달빛 정글' }));
    expect(within(group).getByRole('radio', { name: '달빛 정글' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(screen.getByRole('button', { name: '만들기' }));

    expect(onCreate).toHaveBeenCalledWith('방', 5, 'MOONLIT', undefined);
  });

  it('다시 열면 테마도 원목 라운지로 돌아간다', async () => {
    const { rerender } = render(<CreateRoomModal open defaultName="방" onClose={vi.fn()} onCreate={vi.fn()} />);
    await userEvent.click(screen.getByRole('radio', { name: '열대 해변' }));

    rerender(<CreateRoomModal open={false} defaultName="방" onClose={vi.fn()} onCreate={vi.fn()} />);
    rerender(<CreateRoomModal open defaultName="방" onClose={vi.fn()} onCreate={vi.fn()} />);

    expect(screen.getByRole('radio', { name: '원목 라운지' })).toHaveAttribute('aria-checked', 'true');
  });

  it('비밀번호 칸은 펼침 애니메이션으로 나타나고 접힘 애니메이션이 끝나면 사라진다', async () => {
    render(<CreateRoomModal open defaultName="방" onClose={vi.fn()} onCreate={vi.fn()} />);
    const toggle = screen.getByRole('switch', { name: '비공개방' });

    await userEvent.click(toggle);
    const reveal = await screen.findByTestId('password-reveal');
    expect(reveal).toHaveStyle({ overflow: 'hidden' });
    expect(within(reveal).getByLabelText('비밀번호')).toBeInTheDocument();

    await userEvent.click(toggle);
    await waitFor(() => expect(screen.queryByTestId('password-reveal')).not.toBeInTheDocument());
    expect(screen.queryByLabelText('비밀번호')).not.toBeInTheDocument();
  });
});
