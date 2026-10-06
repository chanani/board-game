import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '../api/chat';
import { ChatPanel } from './ChatPanel';
import { ChatColorProvider, chatOrderOf } from './chatColors';

const messages: ChatMessage[] = [
  { id: 1, memberId: 1, nickname: '앨리스', text: '안녕하세요', sentAt: '2026-10-06T00:00:00Z' },
  { id: 2, memberId: 2, nickname: '밥', text: '<b>반가워요</b>', sentAt: '2026-10-06T00:00:01Z' },
];

describe('ChatPanel', () => {
  it('관전자 메시지 머리줄은 닉네임 다음에 관전 배지가 오고, 둘의 줄 높이가 같다', () => {
    const spectator: ChatMessage[] = [
      { id: 2, memberId: 3, nickname: '캐롤', text: '구경 왔어요', sentAt: '2026-10-06T00:00:01Z', spectator: true },
    ];
    render(<ChatPanel messages={spectator} meId={1} onSend={vi.fn()} />);
    const badge = screen.getByTestId('spectator-badge');
    const header = badge.parentElement as HTMLElement;
    expect(header.firstElementChild).toHaveTextContent('캐롤');
    expect(header.lastElementChild).toBe(badge);
    expect(header).toHaveClass('h-[18px]', 'items-center');
    expect(badge).toHaveClass('h-[18px]');
  });

  it('관전자가 보낸 글은 이름 앞에 망원경 아이콘이 든 관전 배지를 단다', () => {
    const mixed: ChatMessage[] = [
      { id: 1, memberId: 2, nickname: '밥', text: '안녕', sentAt: '2026-10-06T00:00:00Z', spectator: false },
      { id: 2, memberId: 3, nickname: '캐롤', text: '구경 왔어요', sentAt: '2026-10-06T00:00:01Z', spectator: true },
    ];
    render(<ChatPanel messages={mixed} meId={1} onSend={vi.fn()} />);

    const spectatorLine = screen.getByText('구경 왔어요').closest('li') as HTMLElement;
    const badge = spectatorLine.querySelector('[data-testid="spectator-badge"]') as HTMLElement;
    expect(badge).toHaveTextContent('관전');
    expect(badge.querySelector('svg')).not.toBeNull();
    const playerLine = screen.getByText('안녕').closest('li') as HTMLElement;
    expect(playerLine.querySelector('[data-testid="spectator-badge"]')).toBeNull();
  });

  it('다른 사람 이름과 말풍선은 방에 들어온 순서로 정한 그 사람 색을 쓴다', () => {
    const mixed: ChatMessage[] = [
      { id: 1, memberId: 2, nickname: '밥', text: '안녕', sentAt: '2026-10-06T00:00:00Z' },
      { id: 2, memberId: 3, nickname: '캐롤', text: '구경 왔어요', sentAt: '2026-10-06T00:00:01Z', spectator: true },
    ];
    render(
      <ChatColorProvider order={chatOrderOf({ members: [{ id: 1 }, { id: 2 }], spectators: [{ id: 3 }] })}>
        <ChatPanel messages={mixed} meId={1} onSend={vi.fn()} />
      </ChatColorProvider>,
    );
    expect(screen.getByText('밥')).toHaveClass('text-teal-700');
    expect(screen.getByText('안녕')).toHaveClass('bg-teal-100');
    expect(screen.getByText('캐롤')).toHaveClass('text-violet-700');
    expect(screen.getByText('구경 왔어요')).toHaveClass('bg-violet-100');
  });

  it('내 메시지와 남의 메시지를 구분해 보여 주고 글은 그대로 글자로 보여 준다', () => {
    render(<ChatPanel messages={messages} meId={1} onSend={vi.fn()} />);

    expect(screen.getByText('안녕하세요').closest('[data-mine]')).toHaveAttribute('data-mine', 'true');
    expect(screen.getByText('<b>반가워요</b>').closest('[data-mine]')).toHaveAttribute('data-mine', 'false');
    expect(screen.getByText('밥')).toBeInTheDocument();
    expect(screen.queryByText('앨리스')).not.toBeInTheDocument();
  });

  it('남의 말풍선 줄은 목록 너비를 다 써서 말풍선 최대 너비(80%)가 짧은 글을 억지로 줄바꿈하지 않는다', () => {
    render(<ChatPanel messages={messages} meId={1} onSend={vi.fn()} />);

    const row = screen.getByText('<b>반가워요</b>').parentElement;

    expect(row).toHaveClass('w-full');
    expect(row).not.toHaveClass('max-w-full');
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

  describe('시간 표시', () => {
    const at = (h: number, m: number, s = 0) => new Date(2026, 9, 6, h, m, s).toISOString();
    const line = (id: number, memberId: number, minute: number, sec = 0): ChatMessage =>
      ({ id, memberId, nickname: memberId === 1 ? '앨리스' : '밥', text: `글${id}`, sentAt: at(14, minute, sec) });

    it('말풍선 옆에 HH:mm을 보여 준다', () => {
      render(<ChatPanel messages={[line(1, 2, 5)]} meId={1} onSend={vi.fn()} />);

      expect(screen.getByText('14:05')).toBeInTheDocument();
    });

    it('같은 사람이 같은 분에 이어서 보낸 글은 마지막에만 시간을 보여 준다', () => {
      render(<ChatPanel messages={[line(1, 2, 5, 1), line(2, 2, 5, 20), line(3, 2, 5, 50)]} meId={1} onSend={vi.fn()} />);

      expect(screen.getAllByText('14:05')).toHaveLength(1);
      expect(screen.getByText('글3').closest('li')).toHaveTextContent('14:05');
      expect(screen.getByText('글1').closest('li')).not.toHaveTextContent('14:05');
    });

    it('분이 바뀌거나 보낸 사람이 바뀌면 각각 시간을 보여 준다', () => {
      render(<ChatPanel messages={[line(1, 2, 5), line(2, 2, 6), line(3, 1, 6), line(4, 2, 6)]} meId={1} onSend={vi.fn()} />);

      expect(screen.getAllByText('14:05')).toHaveLength(1);
      expect(screen.getAllByText('14:06')).toHaveLength(3);
    });
  });
});
