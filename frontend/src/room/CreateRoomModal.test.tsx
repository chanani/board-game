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
    await userEvent.click(screen.getByRole('button', { name: '방 만들기' }));

    expect(onCreate).toHaveBeenCalledWith('앨리스의 방', 3, 'WOOD', '1234');
  });

  it('공개방이면 비밀번호 없이 만든다', async () => {
    const onCreate = vi.fn();
    render(<CreateRoomModal open defaultName="방" onClose={vi.fn()} onCreate={onCreate} />);

    await userEvent.click(screen.getByRole('button', { name: '방 만들기' }));

    expect(onCreate).toHaveBeenCalledWith('방', 5, 'WOOD', undefined);
  });

  it('비공개인데 비밀번호가 비었거나 짧으면 만들지 않는다', async () => {
    const onCreate = vi.fn();
    render(<CreateRoomModal open defaultName="방" onClose={vi.fn()} onCreate={onCreate} />);
    await userEvent.click(screen.getByRole('switch', { name: '비공개방' }));

    await userEvent.click(screen.getByRole('button', { name: '방 만들기' }));
    await userEvent.type(screen.getByLabelText('비밀번호'), '12');
    await userEvent.click(screen.getByRole('button', { name: '방 만들기' }));

    expect(onCreate).not.toHaveBeenCalled();
  });

  it('방 이름은 앞뒤 공백을 지우고 공백뿐이면 만들지 않는다', async () => {
    const onCreate = vi.fn();
    render(<CreateRoomModal open defaultName="방" onClose={vi.fn()} onCreate={onCreate} />);
    const input = screen.getByLabelText('방 이름');

    await userEvent.clear(input);
    await userEvent.type(input, '   ');
    await userEvent.click(screen.getByRole('button', { name: '방 만들기' }));
    expect(onCreate).not.toHaveBeenCalled();
    await userEvent.type(input, ' 새방 ');
    await userEvent.click(screen.getByRole('button', { name: '방 만들기' }));

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
    await userEvent.click(screen.getByRole('button', { name: '방 만들기' }));

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

  it('제목은 "새 방 만들기"이고 구역 제목과 "비공개방" 토글이 있다', async () => {
    render(<CreateRoomModal open defaultName="방" onClose={vi.fn()} onCreate={vi.fn()} />);
    const dialog = await screen.findByRole('dialog', { name: '새 방 만들기' });

    expect(within(dialog).getByRole('heading', { name: '새 방 만들기' })).toBeInTheDocument();
    expect(within(dialog).getByText('방 이름')).toBeInTheDocument();
    expect(within(dialog).getByText('최대 인원')).toBeInTheDocument();
    expect(within(dialog).getByText('테마')).toBeInTheDocument();
    expect(within(dialog).getByRole('switch')).toHaveAccessibleName('비공개방');
    expect(within(dialog).queryByText(/비밀번호로만 입장/)).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: '취소' })).toBeInTheDocument();
  });

  it('최대 인원은 2~5 라디오 묶음이고 화살표 키로 옮긴다', async () => {
    const onCreate = vi.fn();
    render(<CreateRoomModal open defaultName="방" onClose={vi.fn()} onCreate={onCreate} />);
    const group = screen.getByRole('radiogroup', { name: '최대 인원' });
    const seats = within(group).getAllByRole('radio');

    expect(seats.map((seat) => seat.textContent)).toEqual(['2', '3', '4', '5']);
    expect(within(group).getByRole('radio', { name: '5' })).toHaveAttribute('tabindex', '0');
    expect(within(group).getByRole('radio', { name: '2' })).toHaveAttribute('tabindex', '-1');

    within(group).getByRole('radio', { name: '5' }).focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(within(group).getByRole('radio', { name: '4' })).toHaveAttribute('aria-checked', 'true');
    expect(within(group).getByRole('radio', { name: '4' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(within(group).getByRole('radio', { name: '2' })).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(screen.getByRole('button', { name: '방 만들기' }));
    expect(onCreate).toHaveBeenCalledWith('방', 2, 'WOOD', undefined);
  });

  it('비밀번호 칸 위 간격은 펼쳐지는 영역 안쪽에 있어 높이와 함께 나타난다', async () => {
    render(<CreateRoomModal open defaultName="방" onClose={vi.fn()} onCreate={vi.fn()} />);

    await userEvent.click(screen.getByRole('switch', { name: '비공개방' }));
    const reveal = await screen.findByTestId('password-reveal');
    const inner = reveal.firstElementChild as HTMLElement;

    expect(inner).toHaveClass('pt-3');
    expect(reveal.className).not.toMatch(/\b(m|mt|my|pt|py)-/);
    expect(within(inner).getByLabelText('비밀번호')).toBeInTheDocument();
    expect(within(inner).getByLabelText('비밀번호')).toHaveAccessibleDescription(/4~20자로 정해요/);
  });
});
