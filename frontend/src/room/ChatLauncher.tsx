import { AnimatePresence, motion } from 'motion/react';
import { type ReactNode, useEffect, useState } from 'react';
import type { ChatMessage } from '../api/chat';
import { ChatIcon, CloseIcon } from '../components/icons';
import { PC_QUERY, useMediaQuery } from '../lib/useMediaQuery';
import { ChatPanel } from './ChatPanel';

type Props = {
  messages: ChatMessage[];
  meId: number;
  onSend: (text: string) => boolean;
  unread: number;
  /** 채팅을 열었거나, 열려 있는 동안 새 메시지가 왔을 때(읽음 처리). */
  onOpen: () => void;
};

const badgeOf = (unread: number) => (unread > 9 ? '9+' : String(unread));

/** 위에 모달(aria-modal)이 떠 있거나 이미 누가 처리한 Esc는 그쪽 몫이라 채팅을 닫지 않는다. */
function escapeIsMine(event: KeyboardEvent): boolean {
  return event.key === 'Escape' && !event.defaultPrevented && document.querySelector('[aria-modal="true"]') === null;
}

/** PC는 버튼이 그대로 떠 있다. 모바일은 떠 있는 버튼이 내 판 옆 칸(예상 점수)을 덮으므로 화면 맨 아래 줄에 놓는다. */
function LauncherDock({ pc, children }: { pc: boolean; children: ReactNode }) {
  if (pc) {
    return <>{children}</>;
  }
  return <div data-testid="chat-launcher-dock" className="flex justify-end px-1">{children}</div>;
}

/**
 * 게임 중 채팅. 말풍선 버튼으로 연다(PC는 오른쪽 아래에 떠 있고, 모바일은 화면 맨 아래 줄). PC는 오른쪽 서랍, 모바일은 아래 시트.
 * 모달(z-40) 아래 층(z-30)에 두어 상대 보드·규칙 모달을 가리거나 클릭을 가로채지 않는다.
 * 게임 화면은 방 화면이라 "돌아가기" 바가 뜨지 않는다. 알림(토스트)은 z-50으로 이 위에 뜨고,
 * 모바일 시트가 열려 있는 동안에는 html[data-chat-sheet]로 시트 위로 올린다.
 */
export function ChatLauncher({ messages, meId, onSend, unread, onOpen }: Props) {
  const [open, setOpen] = useState(false);
  const pc = useMediaQuery(PC_QUERY);

  useEffect(() => {
    if (open) {
      onOpen();
    }
  }, [open, messages, onOpen]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onKey = (event: KeyboardEvent) => {
      if (escapeIsMine(event)) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const sheetOpen = open && !pc;
  useEffect(() => {
    if (!sheetOpen) {
      return undefined;
    }
    document.documentElement.dataset.chatSheet = 'on';
    return () => { delete document.documentElement.dataset.chatSheet; };
  }, [sheetOpen]);

  const label = unread > 0 ? `채팅 열기 (안 읽은 메시지 ${unread}개)` : '채팅 열기';
  const frame = pc
    ? 'fixed bottom-20 right-4 z-30 h-[60vh] w-80 origin-bottom-right rounded-2xl'
    : 'fixed inset-x-0 bottom-0 z-30 h-[60vh] rounded-t-3xl pb-[max(1rem,env(safe-area-inset-bottom))]';
  const hidden = pc ? { opacity: 0, scale: 0.95, y: 16 } : { y: '100%' };
  const shown = pc ? { opacity: 1, scale: 1, y: 0 } : { y: 0 };

  return (
    <>
      {open ? null : (
        <LauncherDock pc={pc}>
        <motion.button type="button" aria-label={label} onClick={() => setOpen(true)} whileTap={{ scale: 0.9 }}
          className={`press-3d ${pc ? 'fixed bottom-4 right-4' : 'relative'} z-30 flex h-14 w-14 items-center justify-center rounded-full bg-mustard-400 text-wood-800 shadow-[0_4px_0_var(--color-mustard-600),0_10px_18px_rgb(0_0_0/0.4)] hover:bg-mustard-300`}>
          <ChatIcon className="h-7 w-7" />
          {unread > 0 ? (
            <motion.span key={unread} aria-hidden="true" initial={{ scale: 0.4 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 14 }}
              className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-brick-500 px-1.5 text-xs font-black text-cream-50 ring-2 ring-cream-50">
              {badgeOf(unread)}
            </motion.span>
          ) : null}
        </motion.button>
        </LauncherDock>
      )}
      <AnimatePresence>
        {open ? (
          <motion.aside key="chat" role="dialog" aria-label="채팅" data-variant={pc ? 'drawer' : 'sheet'}
            initial={hidden} animate={shown} exit={hidden} transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
            className={`${frame} flex flex-col gap-3 bg-cream-50 p-4 shadow-[0_-4px_0_var(--color-cream-200),0_18px_40px_rgb(0_0_0/0.45)]`}>
            <header className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold text-wood-800"><ChatIcon /> 채팅</h2>
              <button type="button" aria-label="채팅 닫기" onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-wood-700 hover:bg-cream-200">
                <CloseIcon />
              </button>
            </header>
            <ChatPanel messages={messages} meId={meId} onSend={onSend} autoFocus={pc} className={pc ? 'flex-1' : 'flex-1 pt-1'} />
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </>
  );
}
