import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { ChatMessage } from '../api/chat';
import { chatTime } from '../lib/format';

export const CHAT_MAX_LENGTH = 200;
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
  const [text, setText] = useState('');
  const listRef = useRef<HTMLOListElement>(null);
  const nearBottomRef = useRef(true);
  const trimmed = text.trim();

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

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  const submit = () => {
    if (!trimmed) {
      return;
    }
    if (onSend(trimmed)) {
      setText('');
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  // 한글 조합 중 Enter는 글자를 확정하는 키라서 보내지 않는다.
  // Safari(WebKit)는 조합을 끝내는 Enter를 isComposing=false, keyCode 229로 보내므로 함께 거른다.
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return;
    }
    event.preventDefault();
    if (event.nativeEvent.isComposing || event.keyCode === 229) {
      return;
    }
    submit();
  };

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
      <form onSubmit={onSubmit} className="flex gap-2">
        <input ref={inputRef} value={text} onChange={(event) => setText(event.target.value)} onKeyDown={onKeyDown}
          aria-label="채팅 입력" maxLength={CHAT_MAX_LENGTH} placeholder="메시지를 입력해요" autoComplete="off"
          className="min-w-0 flex-1 rounded-xl border border-cream-300 bg-cream px-3 py-2 text-sm shadow-[inset_0_2px_4px_rgb(0_0_0/0.12)] outline-none focus:border-mustard-400 focus:ring-2 focus:ring-mustard-300/50" />
        <button type="submit" disabled={!trimmed}
          className="press-3d shrink-0 rounded-xl bg-mustard-400 px-3 py-2 text-sm font-bold text-wood-800 shadow-[0_3px_0_var(--color-mustard-600)] hover:bg-mustard-300 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none">
          보내기
        </button>
      </form>
    </div>
  );
}

function ChatLine({ message, mine, showTime }: { message: ChatMessage; mine: boolean; showTime: boolean }) {
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
  return (
    <li data-mine="false" className="flex flex-col items-start gap-0.5">
      <span className="px-1 text-xs font-bold text-wood-700">{message.nickname}</span>
      <div className="flex max-w-full items-end gap-1.5">
        <p className="max-w-[80%] whitespace-pre-wrap break-words rounded-2xl rounded-bl-md bg-cream-50 px-3 py-1.5 text-sm text-wood-800 shadow-sm ring-1 ring-cream-300">
          {message.text}
        </p>
        {time}
      </div>
    </li>
  );
}
