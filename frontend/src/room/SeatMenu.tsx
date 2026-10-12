import { useEffect, useRef, type RefObject } from 'react';
import { motion } from 'motion/react';
import { RobotIcon, UserPlusIcon } from '../components/icons';

export type MenuPlacement = 'up' | 'down';
export type MenuAlign = 'start' | 'center' | 'end';

const VERTICAL: Record<MenuPlacement, string> = { up: 'bottom-full mb-2', down: 'top-full mt-2' };
const HORIZONTAL: Record<MenuAlign, string> = { start: 'left-0', center: 'left-1/2 -translate-x-1/2', end: 'right-0' };

type Props = {
  /** 메뉴와 빈자리 버튼을 함께 감싼 요소. 이 밖을 누르면 닫는다. */
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  /** 있으면 "친구 초대"를 보인다(방에 앉아 있는 사람 모두). */
  onInvite?: () => void;
  /** 있으면 "컴퓨터와 하기"를 보인다(방장만). */
  onAddBot?: () => void;
  placement?: MenuPlacement;
  align?: MenuAlign;
};

const ITEM = 'flex w-full cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-left text-sm font-bold outline-none hover:bg-mustard-200/70 focus-visible:ring-2 focus-visible:ring-mustard-400';

/** 빈자리를 누르면 뜨는 작은 메뉴: 친구를 부르거나 컴퓨터를 앉힌다. 고르거나 바깥·Esc를 누르면 닫힌다. */
export function SeatMenu({ anchorRef, onClose, onInvite, onAddBot, placement = 'down', align = 'center' }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    menuRef.current?.querySelector('button')?.focus({ preventScroll: true });
    const onPointer = (event: PointerEvent) => {
      if (!anchorRef.current?.contains(event.target as Node)) {
        closeRef.current();
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeRef.current();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [anchorRef]);

  const pick = (action: () => void) => {
    onClose();
    action();
  };

  return (
    <motion.div ref={menuRef} role="menu" aria-label="빈자리 채우기" data-testid="seat-menu"
      initial={{ opacity: 0, scale: 0.85, y: placement === 'up' ? 6 : -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', bounce: 0.4, duration: 0.3 }}
      className={`absolute z-40 flex w-max flex-col gap-0.5 rounded-2xl bg-cream-50 p-1.5 text-wood-800 shadow-[0_4px_0_var(--color-cream-300),0_12px_24px_rgb(0_0_0/0.35)] ${VERTICAL[placement]} ${HORIZONTAL[align]}`}>
      {onInvite ? (
        <button type="button" role="menuitem" className={ITEM} onClick={() => pick(onInvite)}>
          <UserPlusIcon className="h-5 w-5 shrink-0 text-felt-600" />친구 초대
        </button>
      ) : null}
      {onAddBot ? (
        <button type="button" role="menuitem" className={ITEM} onClick={() => pick(onAddBot)}>
          <RobotIcon className="h-5 w-5 shrink-0 text-wood-700" />컴퓨터와 하기
        </button>
      ) : null}
    </motion.div>
  );
}
