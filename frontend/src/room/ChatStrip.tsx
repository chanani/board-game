import type { ChatMessage } from '../api/chat';
import { MemberAvatar } from '../components/Avatar';
import { SpectatorBadge } from './ChatPanel';
import { ChatInput } from './ChatInput';
import { useChatTone } from './chatColors';

const SHOWN = 3;

type Props = {
  messages: ChatMessage[];
  meId: number;
  onSend: (text: string) => boolean;
  /** 메시지 줄을 눌러 전체 채팅(시트)을 열 때. */
  onExpand: () => void;
  /** 좁은 자리라 입력칸 안내 문구를 짧게 쓸지. */
  compact?: boolean;
};

/**
 * PC가 아닌 게임 화면의 채팅 줄: 최근 메시지 3개를 메신저처럼 작은 말풍선으로 보여 주고 아래에 입력칸을 둔다.
 * 내 말은 오른쪽 노란 풍선, 다른 사람은 왼쪽에 그 사람 색으로. 말풍선 칸은 늘 3개 높이라 메시지가 와도 테이블이 밀리지 않는다.
 */
export function ChatStrip({ messages, meId, onSend, onExpand, compact = false }: Props) {
  const recent = messages.slice(-SHOWN);
  const toneOf = useChatTone();
  return (
    <div data-testid="chat-strip" className="paper space-y-2 p-2.5">
      {/* 보이는 메시지 글이 그대로 버튼 이름이 되고, 끝에 화면 읽기용 "채팅 전체 보기"를 붙인다. */}
      <button type="button" onClick={onExpand} className="block w-full text-left">
        <span aria-live="polite" data-testid="chat-strip-lines" className="flex h-[80px] flex-col justify-end gap-1 overflow-hidden">
          {recent.length === 0 ? <span className="block text-center text-xs text-stone-500">아직 대화가 없어요.</span> : null}
          {recent.map((message) => {
            if (message.memberId === meId) {
              return (
                <span key={message.id} data-testid="chat-strip-line" data-mine="true"
                  className="block h-6 max-w-[85%] shrink-0 self-end truncate rounded-xl rounded-br-sm bg-mustard-300 px-2.5 text-xs leading-6 text-wood-800">
                  <span className="sr-only">나 </span>{message.text}
                </span>
              );
            }
            const tone = toneOf(message.memberId);
            return (
              <span key={message.id} data-testid="chat-strip-line" data-mine="false"
                className={`block h-6 max-w-[85%] shrink-0 self-start truncate rounded-xl rounded-bl-sm px-2.5 text-xs leading-6 text-wood-800 ${tone.bubble}`}>
                <MemberAvatar memberId={message.memberId} avatar={message.avatar} size={16} className="mr-1 align-[-4px]" />
                <b className={tone.name}>{message.nickname}</b>{' '}
                {message.spectator ? <><SpectatorBadge />{' '}</> : null}
                {message.text}
              </span>
            );
          })}
        </span>
        {' '}<span className="sr-only">채팅 전체 보기</span>
      </button>
      <ChatInput onSend={onSend} compact={compact} />
    </div>
  );
}
