import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '../api/chat';
import { setMediaMatches } from '../test/media';
import { Modal } from '../components/Modal';
import { ChatLauncher } from './ChatLauncher';

const messages: ChatMessage[] = [{ id: 1, memberId: 2, nickname: '밥', text: '안녕하세요', sentAt: '2026-10-06T00:00:00Z' }];

describe('ChatLauncher', () => {
  it('닫혀 있으면 안 읽은 수를 배지로 보여 준다', () => {
    render(<ChatLauncher messages={messages} meId={1} onSend={vi.fn()} unread={3} onOpen={vi.fn()} />);

    expect(screen.getByRole('button', { name: '채팅 열기 (안 읽은 메시지 3개)' })).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: '채팅' })).not.toBeInTheDocument();
  });

  it('PC에서 누르면 오른쪽 서랍으로 채팅을 열고 읽음 처리한다', async () => {
    const onOpen = vi.fn();
    render(<ChatLauncher messages={messages} meId={1} onSend={vi.fn()} unread={1} onOpen={onOpen} />);

    await userEvent.click(screen.getByRole('button', { name: /채팅 열기/ }));

    const dialog = screen.getByRole('dialog', { name: '채팅' });
    expect(dialog).toHaveAttribute('data-variant', 'drawer');
    expect(screen.getByText('안녕하세요')).toBeInTheDocument();
    expect(onOpen).toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: '채팅 닫기' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '채팅' })).not.toBeInTheDocument());
  });

  it('PC에서는 버튼이 오른쪽 아래에 떠 있다', () => {
    render(<ChatLauncher messages={messages} meId={1} onSend={vi.fn()} unread={0} onOpen={vi.fn()} />);

    expect(screen.getByRole('button', { name: '채팅 열기' })).toHaveClass('fixed', 'bottom-4', 'right-4');
  });

  it('모바일에서는 버튼이 떠 있지 않고 화면 맨 아래 줄에 놓여 내 판 옆 예상 점수를 가리지 않는다', () => {
    setMediaMatches(false);
    render(<ChatLauncher messages={messages} meId={1} onSend={vi.fn()} unread={0} onOpen={vi.fn()} />);

    const button = screen.getByRole('button', { name: '채팅 열기' });
    expect(button).not.toHaveClass('fixed');
    expect(button.parentElement).toHaveAttribute('data-testid', 'chat-launcher-dock');
    expect(button.parentElement).toHaveClass('flex', 'justify-end');
  });

  it('모바일에서는 아래 시트로 열린다', async () => {
    setMediaMatches(false);
    render(<ChatLauncher messages={messages} meId={1} onSend={vi.fn()} unread={0} onOpen={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: '채팅 열기' }));

    expect(screen.getByRole('dialog', { name: '채팅' })).toHaveAttribute('data-variant', 'sheet');
  });

  it('모달(z-40)보다 아래 층에 뜬다', async () => {
    render(<ChatLauncher messages={messages} meId={1} onSend={vi.fn()} unread={0} onOpen={vi.fn()} />);

    const button = screen.getByRole('button', { name: '채팅 열기' });
    expect(button).toHaveClass('z-30');
    await userEvent.click(button);
    expect(screen.getByRole('dialog', { name: '채팅' })).toHaveClass('z-30');
  });
  it('Esc로 닫힌다', async () => {
    render(<ChatLauncher messages={messages} meId={1} onSend={vi.fn()} unread={0} onOpen={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: '채팅 열기' }));

    await userEvent.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog', { name: '채팅' })).not.toBeInTheDocument());
  });

  it('위에 모달이 떠 있으면 Esc는 모달만 닫고 채팅은 그대로 둔다', async () => {
    const onCloseModal = vi.fn();
    const ui = (modalOpen: boolean) => (
      <>
        <ChatLauncher messages={messages} meId={1} onSend={vi.fn()} unread={0} onOpen={vi.fn()} />
        <Modal open={modalOpen} title="상대 판" onClose={onCloseModal}><button type="button">확인</button></Modal>
      </>
    );
    const { rerender } = render(ui(false));
    await userEvent.click(screen.getByRole('button', { name: '채팅 열기' }));
    rerender(ui(true));

    await userEvent.keyboard('{Escape}');

    expect(onCloseModal).toHaveBeenCalledOnce();
    expect(screen.getByRole('dialog', { name: '채팅' })).toBeInTheDocument();
  });

  it('다른 곳에서 이미 처리한(defaultPrevented) Esc는 무시한다', async () => {
    render(<ChatLauncher messages={messages} meId={1} onSend={vi.fn()} unread={0} onOpen={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: '채팅 열기' }));

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    event.preventDefault();
    act(() => { document.dispatchEvent(event); });

    expect(screen.getByRole('dialog', { name: '채팅' })).toBeInTheDocument();
  });
});
