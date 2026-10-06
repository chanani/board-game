import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ChevronDownIcon } from './icons';
import { LogoutConfirmModal } from './LogoutConfirmModal';
import { SoundSettings } from './SoundSettings';
import { Button } from './ui';
import { useLogoutFlow } from './useLogoutFlow';

/** 위에 모달(aria-modal)이 떠 있거나 이미 누가 처리한 Esc는 그쪽 몫이라 메뉴를 닫지 않는다. */
function escapeIsMine(event: KeyboardEvent): boolean {
  return event.key === 'Escape' && !event.defaultPrevented && document.querySelector('[aria-modal="true"]') === null;
}

/** 열려 있는 동안 Esc·바깥 누르기·페이지 이동으로 닫는다. */
function useDismiss(open: boolean, close: () => void, inside: React.RefObject<HTMLElement | null>) {
  const { pathname } = useLocation();

  useEffect(() => close(), [pathname, close]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onKey = (event: KeyboardEvent) => {
      if (escapeIsMine(event)) {
        // 처리한 Esc는 표시해 둬서, 같이 열려 있는 채팅 시트가 한 번 더 닫히지 않게 한다.
        event.preventDefault();
        close();
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (!inside.current?.contains(event.target as Node)) {
        close();
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open, close, inside]);
}

/** 오른쪽 위 닉네임 버튼과, 눌렀을 때 펼쳐지는 계정·소리·로그아웃 메뉴. */
export function UserMenu() {
  const { member } = useAuth();
  const reduceMotion = useReducedMotion();
  const { askLogout, modalProps } = useLogoutFlow();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, rootRef);

  const logout = () => {
    close();
    void askLogout();
  };

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button type="button" aria-expanded={open} aria-controls={open ? 'user-menu' : undefined} onClick={() => setOpen((value) => !value)}
        className="flex min-w-0 items-center gap-1 rounded-lg px-1.5 py-1 font-bold text-cream-50 hover:bg-black/15">
        <span className="min-w-0 max-w-[4.5rem] truncate sm:max-w-none">{member?.nickname}</span>
        <ChevronDownIcon />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div id="user-menu" data-testid="user-menu" style={{ transformOrigin: 'top right' }}
            initial={{ opacity: 0, y: reduceMotion ? 0 : -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -8, scale: 0.97 }} transition={{ duration: 0.18 }}
            className="paper absolute right-1 top-full z-50 mt-2 flex w-[260px] max-w-[calc(100vw-2rem)] flex-col gap-3 p-3 sm:right-0">
            <div className="flex flex-col">
              <span className="text-xs text-stone-500">{member?.loginId}</span>
              <span className="font-black text-wood-800">{member?.nickname}</span>
            </div>
            <SoundSettings />
            <hr className="border-wood-700/20" />
            <Button variant="danger" className="w-full" onClick={logout}>로그아웃</Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <LogoutConfirmModal {...modalProps} />
    </div>
  );
}
