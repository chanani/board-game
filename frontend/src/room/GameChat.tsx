import { useCallback, useState } from 'react';
import type { ChatMessage } from '../api/chat';
import { ChatPanel } from './ChatPanel';
import { ChatSheet } from './ChatSheet';
import { ChatStrip } from './ChatStrip';

/** panel: PC 오른쪽 채팅 칸. strip: 최근 3줄 채팅 줄(누르면 전체 채팅 시트). 배치를 아는 RoomPage가 고른다. */
export type GameChatVariant = 'panel' | 'strip';

type Props = {
  variant: GameChatVariant;
  messages: ChatMessage[];
  meId: number;
  onSend: (text: string) => boolean;
};

/** 게임 중 채팅: panel은 오른쪽 채팅 칸, strip은 최근 3줄 채팅 줄(누르면 전체 채팅 시트). */
export function GameChat({ variant, messages, meId, onSend }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  if (variant === 'panel') {
    return (
      <aside data-testid="game-chat-panel" className="paper flex w-[260px] shrink-0 flex-col p-3 lg:sticky lg:top-4 lg:h-[min(35rem,calc(100vh-8rem))]">
        <h2 className="mb-2 text-sm font-bold text-wood-800">채팅</h2>
        <ChatPanel messages={messages} meId={meId} onSend={onSend} className="min-h-0 flex-1" />
      </aside>
    );
  }
  return (
    <>
      <ChatStrip messages={messages} meId={meId} onSend={onSend} onExpand={() => setSheetOpen(true)} />
      <ChatSheet messages={messages} meId={meId} onSend={onSend} open={sheetOpen} onClose={closeSheet} />
    </>
  );
}
