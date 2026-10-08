import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { EmoteBubble } from './EmoteBubble';
import { EmoteDock } from './EmoteDock';
import { EmoteFace } from './EmoteFace';
import { EMOTE_IDS, EMOTE_LABELS, type EmoteId } from './emotes';
import { EmoteContext, type EmoteBubbleState, type RoomEmotes } from './useRoomEmotes';

function emotesOf(overrides: Partial<RoomEmotes> = {}): RoomEmotes {
  return { bubbles: new Map(), send: vi.fn(() => true), coolingDown: false, ...overrides };
}

const withEmotes = (value: RoomEmotes, children: ReactNode) => <EmoteContext.Provider value={value}>{children}</EmoteContext.Provider>;

describe('EmoteFace', () => {
  it('표정 10가지가 모두 서로 다른 그림이다', () => {
    const drawings = EMOTE_IDS.map((emote) => {
      const { container, unmount } = render(<EmoteFace emote={emote} />);
      const markup = container.innerHTML.replace(/data-testid="[^"]*"/, '');
      unmount();
      return markup;
    });

    expect(EMOTE_IDS).toHaveLength(10);
    expect(new Set(drawings).size).toBe(10);
    expect(new Set(Object.values(EMOTE_LABELS)).size).toBe(10);
  });
});

describe('EmoteDock', () => {
  it('방 화면 밖(컨텍스트 없음)에서는 아무것도 그리지 않는다', () => {
    const { container } = render(<EmoteDock meId={1} className="" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('버튼을 누르면 한국어 이름의 표정 10개 패널이 열리고, 고르면 보내고 닫힌다', async () => {
    const emotes = emotesOf();
    render(withEmotes(emotes, <EmoteDock meId={1} className="" />));

    await userEvent.click(screen.getByRole('button', { name: '감정 표현하기' }));
    const panel = screen.getByRole('dialog', { name: '감정 표현' });
    const buttons = within(panel).getAllByRole('button');
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual(EMOTE_IDS.map((emote) => EMOTE_LABELS[emote]));
    expect(within(panel).getByRole('button', { name: '하트 눈' })).toHaveAttribute('title', '하트 눈');

    await userEvent.click(within(panel).getByRole('button', { name: '윙크' }));

    expect(emotes.send).toHaveBeenCalledWith('WINK');
    expect(screen.queryByRole('dialog', { name: '감정 표현' })).not.toBeInTheDocument();
  });

  it('Esc나 바깥을 누르면 보내지 않고 닫힌다', async () => {
    const emotes = emotesOf();
    render(withEmotes(emotes, <div><p>바깥</p><EmoteDock meId={1} className="" /></div>));

    await userEvent.click(screen.getByRole('button', { name: '감정 표현하기' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '감정 표현하기' }));
    await userEvent.click(screen.getByText('바깥'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(emotes.send).not.toHaveBeenCalled();
  });

  it('보낸 직후(잠금 중)에는 표정 버튼이 잠겨 있다', async () => {
    render(withEmotes(emotesOf({ coolingDown: true }), <EmoteDock meId={1} className="" />));

    await userEvent.click(screen.getByRole('button', { name: '감정 표현하기' }));

    within(screen.getByRole('dialog')).getAllByRole('button').forEach((button) => expect(button).toBeDisabled());
  });
});

describe('EmoteBubble', () => {
  const bubbles = (memberId: number, emote: EmoteId, key = 1) => new Map<number, EmoteBubbleState>([[memberId, { key, emote }]]);

  it('그 사람의 표정이 있으면 말풍선을 띄우고, 없어지면 사라진다', async () => {
    const { rerender } = render(withEmotes(emotesOf({ bubbles: bubbles(2, 'CRY') }), <><EmoteBubble memberId={2} /><EmoteBubble memberId={3} /></>));

    const bubble = screen.getByTestId('emote-bubble-2');
    expect(bubble).toHaveAccessibleName('감정 표현: 울음');
    expect(within(bubble).getByTestId('emote-face-CRY')).toBeInTheDocument();
    expect(screen.queryByTestId('emote-bubble-3')).not.toBeInTheDocument();

    rerender(withEmotes(emotesOf(), <><EmoteBubble memberId={2} /><EmoteBubble memberId={3} /></>));

    await waitFor(() => expect(screen.queryByTestId('emote-bubble-2')).not.toBeInTheDocument());
  });
});
