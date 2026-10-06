import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '../api/chat';
import { ChatStrip } from './ChatStrip';

const at = '2026-10-06T05:00:00Z';
const msg = (id: number, memberId: number, nickname: string, text: string, spectator = false): ChatMessage =>
  ({ id, memberId, nickname, text, sentAt: at, spectator });

describe('ChatStrip', () => {
  it('최근 3개만 한 줄씩 보여 주고, 내 메시지는 "나", 관전자는 닉네임 뒤 배지', () => {
    const messages = [msg(1, 2, '밥', '하나'), msg(2, 2, '밥', '둘'), msg(3, 3, '캐롤', '셋', true), msg(4, 1, '앨리스', '넷')];
    render(<ChatStrip messages={messages} meId={1} onSend={() => true} onExpand={vi.fn()} />);
    const lines = screen.getAllByTestId('chat-strip-line');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toHaveTextContent('둘');
    expect(lines[1].querySelector('[data-testid="spectator-badge"]')).not.toBeNull();
    expect(lines[2]).toHaveTextContent('나');
    lines.forEach((line) => expect(line).toHaveClass('truncate'));
  });

  it('메시지가 없으면 안내 한 줄', () => {
    render(<ChatStrip messages={[]} meId={1} onSend={() => true} onExpand={vi.fn()} />);
    expect(screen.getByText('아직 대화가 없어요.')).toBeInTheDocument();
  });

  it('입력하고 Enter로 보내면 입력칸이 비고, 보내기 실패면 글이 남는다', async () => {
    const onSend = vi.fn().mockReturnValueOnce(true).mockReturnValueOnce(false);
    render(<ChatStrip messages={[]} meId={1} onSend={onSend} onExpand={vi.fn()} />);
    const input = screen.getByRole('textbox', { name: '채팅 입력' });
    await userEvent.type(input, '안녕{Enter}');
    expect(onSend).toHaveBeenCalledWith('안녕');
    expect(input).toHaveValue('');
    await userEvent.type(input, '다시{Enter}');
    expect(input).toHaveValue('다시');
  });

  it('메시지 줄을 누르면 전체 채팅을 연다', async () => {
    const onExpand = vi.fn();
    render(<ChatStrip messages={[msg(1, 2, '밥', '하나')]} meId={1} onSend={() => true} onExpand={onExpand} />);
    await userEvent.click(screen.getByRole('button', { name: /채팅 전체 보기/ }));
    expect(onExpand).toHaveBeenCalled();
  });

  it('메시지 줄 버튼의 이름은 보이는 메시지 글을 그대로 쓰고 끝에 "채팅 전체 보기"를 붙인다', () => {
    render(<ChatStrip messages={[msg(1, 2, '밥', '하나')]} meId={1} onSend={() => true} onExpand={vi.fn()} />);
    const button = screen.getByRole('button', { name: /채팅 전체 보기/ });
    expect(button).not.toHaveAttribute('aria-label');
    expect(button).toHaveAccessibleName('밥 하나 채팅 전체 보기');
    expect(button.querySelector('p')).toBeNull();
  });

  it('새 메시지를 화면 읽기 프로그램에 조용히 알린다(aria-live polite)', () => {
    render(<ChatStrip messages={[msg(1, 2, '밥', '하나')]} meId={1} onSend={() => true} onExpand={vi.fn()} />);
    const live = screen.getByTestId('chat-strip-line').closest('[aria-live]');
    expect(live).toHaveAttribute('aria-live', 'polite');
  });
});
