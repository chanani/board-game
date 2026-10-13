import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../api/chat';
import { ChatIcon } from '../components/icons';
import { ChatSheet } from './ChatSheet';

/** 새 메시지 미리보기를 보이는 시간. */
export const CHAT_PREVIEW_MS = 4000;
const MAX_BADGE = 9;

type Props = {
  messages: ChatMessage[];
  meId: number;
  onSend: (text: string) => boolean;
  /** 지금 막 받은 메시지(기록 불러오기로는 바뀌지 않는다). 안 읽은 수와 미리보기는 이것만 센다. */
  latest: ChatMessage | null;
  className?: string;
};

/**
 * 판이 화면을 가득 쓰는 게임 화면의 채팅: 평소에는 작은 버튼 하나만 자리를 차지하고, 누르면 전체 채팅(시트)이 열린다.
 * 닫혀 있는 동안 남이 보낸 메시지는 버튼에 안 읽은 수로 쌓이고, 잠깐 버튼 아래에 한 줄 미리보기로 뜬다(누를 수 없어 판을 막지 않는다).
 */
export function GameChatButton({ messages, meId, onSend, latest, className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [preview, setPreview] = useState<ChatMessage | null>(null);
  // 버튼이 놓이기 전에(대기실에서) 받은 메시지는 세지 않는다.
  const seenRef = useRef(latest?.id ?? 0);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!latest || latest.id <= seenRef.current) {
      return;
    }
    seenRef.current = latest.id;
    if (open || latest.memberId === meId) {
      return;
    }
    setUnread((current) => current + 1);
    setPreview(latest);
  }, [latest, open, meId]);

  useEffect(() => {
    if (!preview) {
      return undefined;
    }
    const timer = window.setTimeout(() => setPreview(null), CHAT_PREVIEW_MS);
    return () => window.clearTimeout(timer);
  }, [preview]);

  const show = () => {
    setOpen(true);
    setUnread(0);
    setPreview(null);
  };
  const label = unread > 0 ? `채팅 열기, 새 메시지 ${unread}개` : '채팅 열기';

  return (
    <div data-testid="game-chat-button" className={`relative shrink-0 ${className}`}>
      <button type="button" aria-label={label} aria-haspopup="dialog" aria-expanded={open} onClick={show}
        className="pill flex h-8 w-8 items-center justify-center rounded-full border border-(--status-border) outline-none focus-visible:ring-2 focus-visible:ring-mustard-300">
        <ChatIcon className="h-4.5 w-4.5" />
        {unread > 0 ? (
          <span data-testid="chat-unread" aria-hidden="true"
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brick-500 px-1 text-[10px] font-black leading-none text-white shadow">
            {unread > MAX_BADGE ? `${MAX_BADGE}+` : unread}
          </span>
        ) : null}
      </button>
      <p aria-live="polite" data-testid="chat-preview"
        className={`pointer-events-none absolute right-0 top-full z-30 mt-1 w-max max-w-[min(18rem,80vw)] truncate rounded-xl rounded-tr-sm bg-cream-50 px-2.5 py-1 text-xs text-wood-800 shadow-[0_2px_8px_rgb(0_0_0/0.4)] ${preview ? '' : 'hidden'}`}>
        {preview ? <><b>{preview.nickname}</b> {preview.text}</> : null}
      </p>
      <ChatSheet messages={messages} meId={meId} onSend={onSend} open={open} onClose={close} />
    </div>
  );
}
