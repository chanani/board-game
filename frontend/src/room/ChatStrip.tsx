import type { ChatMessage } from '../api/chat';
import { SpectatorBadge } from './ChatPanel';
import { ChatInput } from './ChatInput';

const SHOWN = 3;

type Props = {
  messages: ChatMessage[];
  meId: number;
  onSend: (text: string) => boolean;
  /** 메시지 줄을 눌러 전체 채팅(시트)을 열 때. */
  onExpand: () => void;
};

/** PC가 아닌 게임 화면의 채팅 줄: 최근 메시지 3개와 입력칸. */
export function ChatStrip({ messages, meId, onSend, onExpand }: Props) {
  const recent = messages.slice(-SHOWN);
  return (
    <div data-testid="chat-strip" className="paper space-y-2 p-2.5">
      <button type="button" aria-label="채팅 전체 보기" onClick={onExpand} className="block w-full space-y-1 text-left">
        {recent.length === 0 ? <p className="text-xs text-stone-500">아직 대화가 없어요.</p> : null}
        {recent.map((message) => (
          <p key={message.id} data-testid="chat-strip-line" className="truncate text-xs text-wood-800">
            <b className={message.spectator ? 'text-sky-700' : 'text-wood-700'}>{message.memberId === meId ? '나' : message.nickname}</b>
            {message.spectator ? <> <SpectatorBadge /></> : null}
            {' '}{message.text}
          </p>
        ))}
      </button>
      <ChatInput onSend={onSend} />
    </div>
  );
}
