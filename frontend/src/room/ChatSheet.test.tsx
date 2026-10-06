import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '../api/chat';
import { setMediaMatches } from '../test/media';
import { Modal } from '../components/Modal';
import { ChatSheet } from './ChatSheet';

const messages: ChatMessage[] = [{ id: 1, memberId: 2, nickname: '밥', text: '안녕하세요', sentAt: '2026-10-06T00:00:00Z' }];

/** 열고 닫는 상태를 가진 채로 시트를 띄운다. */
function OpenSheet() {
  const [open, setOpen] = useState(true);
  return <ChatSheet messages={messages} meId={1} onSend={vi.fn()} open={open} onClose={() => setOpen(false)} />;
}

describe('ChatSheet', () => {
  it('PC에서는 오른쪽 서랍으로 열리고 닫기 버튼으로 닫힌다', async () => {
    render(<OpenSheet />);

    const dialog = screen.getByRole('dialog', { name: '채팅' });
    expect(dialog).toHaveAttribute('data-variant', 'drawer');
    expect(screen.getByText('안녕하세요')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '채팅 닫기' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '채팅' })).not.toBeInTheDocument());
  });

  it('모바일에서는 아래 시트로 열린다', () => {
    setMediaMatches(false);
    render(<OpenSheet />);

    expect(screen.getByRole('dialog', { name: '채팅' })).toHaveAttribute('data-variant', 'sheet');
  });

  it('모달(z-40)보다 아래 층에 뜬다', () => {
    render(<OpenSheet />);

    expect(screen.getByRole('dialog', { name: '채팅' })).toHaveClass('z-30');
  });

  it('Esc로 닫히고, 처리한 Esc는 다른 곳이 다시 처리하지 않게 표시한다', async () => {
    render(<OpenSheet />);
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });

    act(() => { document.dispatchEvent(event); });

    expect(event.defaultPrevented).toBe(true);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '채팅' })).not.toBeInTheDocument());
  });

  it('위에 모달이 떠 있으면 Esc는 모달만 닫고 채팅은 그대로 둔다', async () => {
    const onCloseModal = vi.fn();
    render(
      <>
        <OpenSheet />
        <Modal open title="상대 판" onClose={onCloseModal}><button type="button">확인</button></Modal>
      </>,
    );

    await userEvent.keyboard('{Escape}');

    expect(onCloseModal).toHaveBeenCalledOnce();
    expect(screen.getByRole('dialog', { name: '채팅' })).toBeInTheDocument();
  });

  it('다른 곳에서 이미 처리한(defaultPrevented) Esc는 무시한다', () => {
    render(<OpenSheet />);

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    event.preventDefault();
    act(() => { document.dispatchEvent(event); });

    expect(screen.getByRole('dialog', { name: '채팅' })).toBeInTheDocument();
  });
});
