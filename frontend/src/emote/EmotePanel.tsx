import { useEffect, useRef, type RefObject } from 'react';
import { motion } from 'motion/react';
import { EmoteFace } from './EmoteFace';
import { EMOTE_IDS, EMOTE_LABELS, type EmoteId } from './emotes';
import { useEmotes } from './useRoomEmotes';

export type PanelPlacement = 'up' | 'down';
export type PanelAlign = 'start' | 'center' | 'end';

const VERTICAL: Record<PanelPlacement, string> = { up: 'bottom-full mb-2', down: 'top-full mt-2' };
const HORIZONTAL: Record<PanelAlign, string> = { start: 'left-0', center: 'left-1/2 -translate-x-1/2', end: 'right-0' };

type Props = {
  /** 패널과 여는 버튼을 함께 감싼 요소. 이 밖을 누르면 닫는다. */
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  placement?: PanelPlacement;
  align?: PanelAlign;
};

/**
 * 표정 10가지를 5개씩 두 줄로 고르는 작은 팝오버. 고르면 보내고 닫는다.
 * 바깥을 누르거나 Esc를 누르면 닫힌다. 보낸 뒤 1초 동안은 버튼이 잠긴다.
 */
export function EmotePanel({ anchorRef, onClose, placement = 'up', align = 'center' }: Props) {
  const emotes = useEmotes();
  const firstRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    firstRef.current?.focus({ preventScroll: true });
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

  if (!emotes) {
    return null;
  }
  const pick = (emote: EmoteId) => {
    if (emotes.send(emote)) {
      onClose();
    }
  };
  return (
    <motion.div role="dialog" aria-label="감정 표현" data-testid="emote-panel"
      initial={{ opacity: 0, scale: 0.85, y: placement === 'up' ? 6 : -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', bounce: 0.4, duration: 0.3 }}
      className={`absolute z-40 w-max rounded-2xl bg-cream-50 p-2 text-wood-800 shadow-[0_4px_0_var(--color-cream-300),0_12px_24px_rgb(0_0_0/0.35)] ${VERTICAL[placement]} ${HORIZONTAL[align]}`}>
      <p className="mb-1 px-1 text-left text-[11px] font-bold leading-none text-wood-700">감정 표현</p>
      <div className="grid grid-cols-5 gap-0.5">
        {EMOTE_IDS.map((emote, index) => (
          <button key={emote} ref={index === 0 ? firstRef : undefined} type="button" aria-label={EMOTE_LABELS[emote]} title={EMOTE_LABELS[emote]}
            disabled={emotes.coolingDown} onClick={() => pick(emote)}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl outline-none transition-transform hover:scale-115 hover:bg-mustard-200/70 focus-visible:ring-2 focus-visible:ring-mustard-400 disabled:cursor-default disabled:opacity-45 disabled:hover:scale-100 disabled:hover:bg-transparent motion-reduce:transition-none motion-reduce:hover:scale-100">
            <EmoteFace emote={emote} size={30} />
          </button>
        ))}
      </div>
    </motion.div>
  );
}
