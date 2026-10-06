import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '../api/chat';
import { ChatPanel } from './ChatPanel';

const messages: ChatMessage[] = [
  { id: 1, memberId: 1, nickname: '앨리스', text: '안녕하세요', sentAt: '2026-10-06T00:00:00Z' },
  { id: 2, memberId: 2, nickname: '밥', text: '<b>반가워요</b>', sentAt: '2026-10-06T00:00:01Z' },
];

describe('ChatPanel', () => {
  it('내 메시지와 남의 메시지를 구분해 보여 주고 글은 그대로 글자로 보여 준다', () => {
    render(<ChatPanel messages={messages} meId={1} onSend={vi.fn()} />);

    expect(screen.getByText('안녕하세요').closest('[data-mine]')).toHaveAttribute('data-mine', 'true');
    expect(screen.getByText('<b>반가워요</b>').closest('[data-mine]')).toHaveAttribute('data-mine', 'false');
    expect(screen.getByText('밥')).toBeInTheDocument();
    expect(screen.queryByText('앨리스')).not.toBeInTheDocument();
  });

  it('Enter로 보내고 보내면 입력창을 비운다', async () => {
    const onSend = vi.fn(() => true);
    render(<ChatPanel messages={[]} meId={1} onSend={onSend} />);

    const input = screen.getByRole('textbox', { name: '채팅 입력' });
    await userEvent.type(input, '  좋아요  {Enter}');

    expect(onSend).toHaveBeenCalledWith('좋아요');
    expect(input).toHaveValue('');
  });

  it('보내지 못하면 입력한 글을 남겨 둔다', async () => {
    render(<ChatPanel messages={[]} meId={1} onSend={() => false} />);

    const input = screen.getByRole('textbox', { name: '채팅 입력' });
    await userEvent.type(input, '좋아요{Enter}');

    expect(input).toHaveValue('좋아요');
  });

  it('빈 글이나 공백만 있으면 보내지 않는다', async () => {
    const onSend = vi.fn(() => true);
    render(<ChatPanel messages={[]} meId={1} onSend={onSend} />);

    await userEvent.type(screen.getByRole('textbox', { name: '채팅 입력' }), '   {Enter}');

    expect(onSend).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '보내기' })).toBeDisabled();
  });

  it('입력은 200자까지다', () => {
    render(<ChatPanel messages={[]} meId={1} onSend={vi.fn()} />);

    expect(screen.getByRole('textbox', { name: '채팅 입력' })).toHaveAttribute('maxLength', '200');
  });

  it('보내기 버튼으로도 보낼 수 있다', async () => {
    const onSend = vi.fn(() => true);
    render(<ChatPanel messages={[]} meId={1} onSend={onSend} />);

    await userEvent.type(screen.getByRole('textbox', { name: '채팅 입력' }), '안녕');
    await userEvent.click(screen.getByRole('button', { name: '보내기' }));

    expect(onSend).toHaveBeenCalledWith('안녕');
  });

  it('한글 조합을 끝내는 Enter(keyCode 229, Safari)는 보내지 않는다', () => {
    const onSend = vi.fn(() => true);
    render(<ChatPanel messages={[]} meId={1} onSend={onSend} />);

    const input = screen.getByRole('textbox', { name: '채팅 입력' });
    fireEvent.change(input, { target: { value: '안녕' } });
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 });

    expect(onSend).not.toHaveBeenCalled();
    expect(input).toHaveValue('안녕');
  });
});
