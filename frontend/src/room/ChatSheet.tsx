import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import type { ChatMessage } from '../api/chat';
import { ChatIcon, CloseIcon } from '../components/icons';
import { PC_QUERY, useMediaQuery } from '../lib/useMediaQuery';
import { ChatPanel } from './ChatPanel';

/** 위에 모달(aria-modal)이 떠 있거나 이미 누가 처리한 Esc는 그쪽 몫이라 채팅을 닫지 않는다. */
function escapeIsMine(event: KeyboardEvent): boolean {
  return event.key === 'Escape' && !event.defaultPrevented && document.querySelector('[aria-modal="true"]') === null;
}

type Props = {
  messages: ChatMessage[];
  meId: number;
  onSend: (text: string) => boolean;
  open: boolean;
  onClose: () => void;
};

/**
 * 채팅 서랍(PC)·아래 시트(모바일). Esc로 닫는다.
 * 모달(z-40) 아래 층(z-30)에 두어 상대 보드·규칙 모달을 가리거나 클릭을 가로채지 않는다.
 * 알림(토스트)은 z-50으로 이 위에 뜨고, 모바일 시트가 열려 있는 동안에는 html[data-chat-sheet]로 시트 위로 올린다.
 */
export function ChatSheet({ messages, meId, onSend, open, onClose }: Props) {
  const pc = useMediaQuery(PC_QUERY);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onKey = (event: KeyboardEvent) => {
      if (escapeIsMine(event)) {
        // 처리한 Esc는 표시해 둬서, 같이 열려 있는 닉네임 메뉴가 한 번 더 닫히지 않게 한다.
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const sheetOpen = open && !pc;
  useEffect(() => {
    if (!sheetOpen) {
      return undefined;
    }
    document.documentElement.dataset.chatSheet = 'on';
    return () => { delete document.documentElement.dataset.chatSheet; };
  }, [sheetOpen]);

  const frame = pc
    ? 'fixed bottom-20 right-4 z-30 h-[60vh] w-80 origin-bottom-right rounded-2xl'
    : 'fixed inset-x-0 bottom-0 z-30 h-[60vh] rounded-t-3xl pb-[max(1rem,env(safe-area-inset-bottom))]';
  const hidden = pc ? { opacity: 0, scale: 0.95, y: 16 } : { y: '100%' };
  const shown = pc ? { opacity: 1, scale: 1, y: 0 } : { y: 0 };

  return (
    <AnimatePresence>
      {open ? (
        <motion.aside key="chat" role="dialog" aria-label="채팅" data-variant={pc ? 'drawer' : 'sheet'}
          initial={hidden} animate={shown} exit={hidden} transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
          className={`${frame} flex flex-col gap-3 bg-cream-50 p-4 shadow-[0_-4px_0_var(--color-cream-200),0_18px_40px_rgb(0_0_0/0.45)]`}>
          <header className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold text-wood-800"><ChatIcon /> 채팅</h2>
            <button type="button" aria-label="채팅 닫기" onClick={onClose}
              className="rounded-full p-1.5 text-wood-700 hover:bg-cream-200">
              <CloseIcon />
            </button>
          </header>
          <ChatPanel messages={messages} meId={meId} onSend={onSend} autoFocus={pc} className={pc ? 'flex-1' : 'flex-1 pt-1'} />
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
