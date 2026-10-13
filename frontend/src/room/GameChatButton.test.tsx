import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '../api/chat';
import { setMediaMatches } from '../test/media';
import { CHAT_PREVIEW_MS, GameChatButton } from './GameChatButton';

const message = (id: number, memberId: number, text: string): ChatMessage => ({ id, memberId, nickname: `P${memberId}`, text, sentAt: '2026-10-13T00:00:00Z' });

function setup(latest: ChatMessage | null = null) {
  const onSend = vi.fn(() => true);
  const tree = (next: ChatMessage | null, history: ChatMessage[] = []) => <GameChatButton messages={next ? [...history, next] : history} meId={1} onSend={onSend} latest={next} />;
  const view = render(tree(latest));
  return { onSend, receive: (next: ChatMessage, history: ChatMessage[] = []) => view.rerender(tree(next, history)) };
}

const button = () => screen.getByRole('button', { name: /채팅 열기/ });

describe('GameChatButton', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('평소에는 버튼 하나뿐이고 안 읽은 표시도 채팅 창도 없다', () => {
    setup();

    expect(button()).toHaveAccessibleName('채팅 열기');
    expect(button()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('chat-unread')).toBeNull();
    expect(screen.queryByRole('dialog', { name: '채팅' })).toBeNull();
    expect(screen.getByTestId('chat-preview')).toHaveClass('hidden');
  });

  it('닫혀 있는 동안 남이 보낸 메시지는 안 읽은 수로 쌓이고 한 줄 미리보기가 잠깐 뜬다', () => {
    vi.useFakeTimers();
    const { receive } = setup();

    receive(message(5, 2, '안녕하세요'));
    expect(screen.getByTestId('chat-unread')).toHaveTextContent('1');
    expect(button()).toHaveAccessibleName('채팅 열기, 새 메시지 1개');
    expect(screen.getByTestId('chat-preview')).toHaveTextContent('P2 안녕하세요');
    expect(screen.getByTestId('chat-preview')).toHaveClass('pointer-events-none');
    expect(screen.getByTestId('chat-preview')).not.toHaveClass('hidden');

    receive(message(6, 3, '잘 부탁해요'));
    expect(screen.getByTestId('chat-unread')).toHaveTextContent('2');
    expect(screen.getByTestId('chat-preview')).toHaveTextContent('P3 잘 부탁해요');

    act(() => { vi.advanceTimersByTime(CHAT_PREVIEW_MS); });
    expect(screen.getByTestId('chat-preview')).toHaveClass('hidden');
    expect(screen.getByTestId('chat-unread')).toHaveTextContent('2');
  });

  it('내가 보낸 메시지, 같은 메시지가 다시 온 것, 버튼이 놓이기 전에 받은 메시지는 세지 않는다', () => {
    const { receive } = setup(message(4, 2, '대기실에서 한 말'));
    expect(screen.queryByTestId('chat-unread')).toBeNull();

    receive(message(5, 1, '내가 한 말'));
    expect(screen.queryByTestId('chat-unread')).toBeNull();

    receive(message(6, 2, '새 말'));
    receive({ ...message(6, 2, '새 말') });
    expect(screen.getByTestId('chat-unread')).toHaveTextContent('1');
  });

  it('열 개부터는 9+로 쓴다', () => {
    const { receive } = setup();
    for (let id = 1; id <= 10; id += 1) {
      receive(message(id, 2, `말 ${id}`));
    }

    expect(screen.getByTestId('chat-unread')).toHaveTextContent('9+');
    expect(button()).toHaveAccessibleName('채팅 열기, 새 메시지 10개');
  });

  it('누르면 전체 채팅이 아래 시트로 열리고 안 읽은 표시와 미리보기가 사라지며, 열려 있는 동안 온 메시지는 세지 않는다', () => {
    setMediaMatches(false);
    const { receive, onSend } = setup();
    receive(message(5, 2, '안녕하세요'));

    fireEvent.click(button());
    const sheet = screen.getByRole('dialog', { name: '채팅' });
    expect(sheet).toHaveAttribute('data-variant', 'sheet');
    expect(sheet).toHaveTextContent('안녕하세요');
    expect(screen.queryByTestId('chat-unread')).toBeNull();
    expect(screen.getByTestId('chat-preview')).toHaveClass('hidden');
    expect(button()).toHaveAttribute('aria-expanded', 'true');

    receive(message(6, 2, '보고 있나요'), [message(5, 2, '안녕하세요')]);
    expect(screen.queryByTestId('chat-unread')).toBeNull();
    expect(sheet).toHaveTextContent('보고 있나요');

    fireEvent.change(screen.getByRole('textbox', { name: '채팅 입력' }), { target: { value: '네' } });
    fireEvent.submit(screen.getByRole('textbox', { name: '채팅 입력' }).closest('form') as HTMLFormElement);
    expect(onSend).toHaveBeenCalledWith('네');
  });
});
