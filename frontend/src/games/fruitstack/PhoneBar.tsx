import { Countdown } from '../../components/Countdown';
import { Button } from '../../components/ui';
import { GameChatButton } from '../../room/GameChatButton';
import type { TableChat } from '../gameModule';

type Props = {
  instruction: string;
  deadline: number | null;
  serverNow: number;
  meId: number;
  onLeave?: () => void;
  chat?: TableChat;
};

/**
 * 세로 휴대폰의 맨 위 한 줄(높이 32px): 나가기, 안내 문구(마지막 5초 카운트다운), 채팅 버튼.
 * 방 상태 바·안내 줄·채팅 줄이 따로 차지하던 높이를 한 줄로 모아 판에 돌려준다.
 */
export function PhoneBar({ instruction, deadline, serverNow, meId, onLeave, chat }: Props) {
  return (
    <div data-testid="fruit-phone-bar" className="relative z-20 mb-1.5 flex h-8 items-center gap-1.5">
      {onLeave ? <Button variant="danger" className="h-8 shrink-0 rounded-lg px-2.5 py-0 text-xs" onClick={onLeave}>나가기</Button> : null}
      <div data-testid="turn-bar" className="flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-(--status-border) bg-(--status-bg) px-2 text-xs text-cream-50 backdrop-blur-[2px]">
        <p role="status" data-testid="instruction" className="min-w-0 truncate font-bold">{instruction}</p>
        <Countdown deadline={deadline} serverNow={serverNow} size="sm" />
      </div>
      {chat ? <GameChatButton messages={chat.messages} meId={meId} onSend={chat.onSend} latest={chat.latest} /> : null}
    </div>
  );
}
