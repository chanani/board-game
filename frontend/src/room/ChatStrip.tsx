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

/** PC가 아닌 게임 화면의 채팅 줄: 최근 메시지 3개와 입력칸. 메시지 칸은 늘 3줄 높이라 메시지가 와도 테이블이 밀리지 않는다. */
export function ChatStrip({ messages, meId, onSend, onExpand }: Props) {
  const recent = messages.slice(-SHOWN);
  return (
    <div data-testid="chat-strip" className="paper space-y-2 p-2.5">
      {/* 보이는 메시지 글이 그대로 버튼 이름이 되고, 끝에 화면 읽기용 "채팅 전체 보기"를 붙인다. */}
      <button type="button" onClick={onExpand} className="block w-full text-left">
        <span aria-live="polite" data-testid="chat-strip-lines" className="flex h-[54px] flex-col justify-end overflow-hidden">
          {recent.length === 0 ? <span className="block h-[18px] text-xs leading-[18px] text-stone-500">아직 대화가 없어요.</span> : null}
          {recent.map((message) => (
            <span key={message.id} data-testid="chat-strip-line" className="block h-[18px] shrink-0 truncate text-xs leading-[18px] text-wood-800">
              <b className={message.spectator ? 'text-sky-700' : 'text-wood-700'}>{message.memberId === meId ? '나' : message.nickname}</b>
              {message.spectator ? <> <SpectatorBadge /></> : null}
              {' '}{message.text}
            </span>
          ))}
        </span>
        {' '}<span className="sr-only">채팅 전체 보기</span>
      </button>
      <ChatInput onSend={onSend} />
    </div>
  );
}
