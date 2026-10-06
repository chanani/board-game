import { useCallback, useEffect, useState } from 'react';
import type { ChatMessage } from '../api/chat';
import { PC_QUERY, useMediaQuery } from '../lib/useMediaQuery';
import { ChatPanel } from './ChatPanel';
import { ChatSheet } from './ChatLauncher';
import { ChatStrip } from './ChatStrip';

type Props = {
  messages: ChatMessage[];
  meId: number;
  onSend: (text: string) => boolean;
  /** 채팅이 보이는 동안 새 메시지가 올 때마다(읽음 처리). */
  onRead: () => void;
};

/** 게임 중 채팅: PC는 오른쪽 채팅 칸, 그 밖에는 최근 3줄 채팅 줄(누르면 전체 채팅 시트). */
export function GameChat({ messages, meId, onSend, onRead }: Props) {
  const pc = useMediaQuery(PC_QUERY);
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  useEffect(() => {
    if (pc) {
      onRead();
    }
  }, [pc, messages, onRead]);

  if (pc) {
    return (
      <aside data-testid="game-chat-panel" className="paper flex w-[260px] shrink-0 flex-col p-3 lg:sticky lg:top-4 lg:h-[calc(100vh-8rem)]">
        <h2 className="mb-2 text-sm font-bold text-wood-800">채팅</h2>
        <ChatPanel messages={messages} meId={meId} onSend={onSend} className="min-h-0 flex-1" />
      </aside>
    );
  }
  return (
    <>
      <ChatStrip messages={messages} meId={meId} onSend={onSend} onExpand={() => setSheetOpen(true)} />
      <ChatSheet messages={messages} meId={meId} onSend={onSend} onOpen={onRead} open={sheetOpen} onClose={closeSheet} />
    </>
  );
}
