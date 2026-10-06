import { useLayoutEffect, useRef } from 'react';
import type { ChatMessage } from '../api/chat';
import { BinocularsIcon } from '../components/icons';
import { chatTime } from '../lib/format';
import { useChatTone } from './chatColors';
import { ChatInput } from './ChatInput';

const NEAR_BOTTOM_PX = 48;

type Props = {
  messages: ChatMessage[];
  meId: number;
  /** 보냈으면 true. false면 입력한 글을 그대로 남겨 둔다. */
  onSend: (text: string) => boolean;
  className?: string;
  /** 열리자마자 입력창에 포커스를 줄지(게임 중 채팅 서랍). */
  autoFocus?: boolean;
};

/** 같은 사람이 같은 분에 이어 보낸 글이면 시간은 그 묶음의 마지막 글에만 붙인다. */
const endsRun = (message: ChatMessage, next: ChatMessage | undefined) =>
  next === undefined || next.memberId !== message.memberId || chatTime(next.sentAt) !== chatTime(message.sentAt);

export function ChatPanel({ messages, meId, onSend, className = '', autoFocus = false }: Props) {
  const listRef = useRef<HTMLOListElement>(null);
  const nearBottomRef = useRef(true);

  const onScroll = () => {
    const list = listRef.current;
    if (list) {
      nearBottomRef.current = list.scrollHeight - list.scrollTop - list.clientHeight < NEAR_BOTTOM_PX;
    }
  };

  // 위로 올려 지난 대화를 보고 있으면 그대로 두고, 맨 아래에 있었거나 내가 보낸 글이면 따라 내려간다.
  const last = messages.at(-1);
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || !last) {
      return;
    }
    if (nearBottomRef.current || last.memberId === meId) {
      list.scrollTop = list.scrollHeight;
      nearBottomRef.current = true;
    }
  }, [last, meId]);

  return (
    <div className={`flex min-h-0 flex-col gap-3 ${className}`}>
      <ol ref={listRef} onScroll={onScroll} aria-label="채팅 메시지" aria-live="polite"
        className="min-h-0 flex-1 space-y-2 scroll-thin overflow-y-auto overscroll-contain rounded-xl bg-cream-200/40 p-3 shadow-[inset_0_2px_4px_rgb(0_0_0/0.08)]">
        {messages.length === 0 ? (
          <li className="py-6 text-center text-sm text-stone-500">아직 대화가 없어요. 먼저 인사해 보세요!</li>
        ) : null}
        {messages.map((message, index) => (
          <ChatLine key={message.id} message={message} mine={message.memberId === meId}
            showTime={endsRun(message, messages[index + 1])} />
        ))}
      </ol>
      <ChatInput onSend={onSend} autoFocus={autoFocus} />
    </div>
  );
}

function ChatLine({ message, mine, showTime }: { message: ChatMessage; mine: boolean; showTime: boolean }) {
  const toneOf = useChatTone();
  const time = showTime ? (
    <time dateTime={message.sentAt} className="shrink-0 pb-0.5 text-[10px] leading-none text-stone-500">{chatTime(message.sentAt)}</time>
  ) : null;
  if (mine) {
    return (
      <li data-mine="true" className="flex items-end justify-end gap-1.5">
        {time}
        <p className="max-w-[80%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-mustard-300 px-3 py-1.5 text-sm text-wood-800 shadow-sm">
          {message.text}
        </p>
      </li>
    );
  }
  const tone = toneOf(message.memberId);
  return (
    <li data-mine="false" className="flex flex-col items-start gap-0.5">
      <span className="flex h-[18px] items-center gap-1 px-1">
        <span className={`text-xs font-bold ${tone.name}`}>{message.nickname}</span>
        {message.spectator ? <SpectatorBadge /> : null}
      </span>
      <div className="flex w-full items-end gap-1.5">
        <p className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl rounded-bl-md px-3 py-1.5 text-sm text-wood-800 shadow-sm ring-1 ring-black/5 ${tone.bubble}`}>
          {message.text}
        </p>
        {time}
      </div>
    </li>
  );
}

export function SpectatorBadge() {
  return (
    <span data-testid="spectator-badge" className="inline-flex h-[18px] items-center gap-0.5 rounded-full bg-sky-100 px-1.5 text-[10px] font-bold leading-none text-sky-800 ring-1 ring-sky-200">
      <BinocularsIcon className="h-3 w-3" />관전
    </span>
  );
}
