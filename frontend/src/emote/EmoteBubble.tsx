import { AnimatePresence, motion } from 'motion/react';
import { EmoteFace } from './EmoteFace';
import { EMOTE_LABELS } from './emotes';
import { useEmotes } from './useRoomEmotes';

/** 기본 자리: 감싼(relative) 아바타·자리의 오른쪽 위 모서리. 채팅 말풍선(가운데 위)과 겹치지 않는다. */
const CORNER = 'absolute -right-5 -top-7';

/**
 * 그 사람이 막 보낸 표정을 하얀 말풍선에 담아 톡 튀어나오게 띄운다(2.5초 뒤 사라짐).
 * 방 화면 밖(감정 표현 정보가 없을 때)에서는 아무것도 그리지 않는다. 동작 줄이기 설정은 App의 MotionConfig가 따른다.
 */
export function EmoteBubble({ memberId, className = CORNER }: { memberId: number; className?: string }) {
  const bubble = useEmotes()?.bubbles.get(memberId);
  return (
    <AnimatePresence>
      {bubble ? (
        <motion.span key={bubble.key} data-testid={`emote-bubble-${memberId}`} role="img" aria-label={`감정 표현: ${EMOTE_LABELS[bubble.emote]}`}
          initial={{ opacity: 0, scale: 0.2, rotate: -18 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: 0.6, y: -8 }}
          transition={{ type: 'spring', bounce: 0.55, duration: 0.45 }}
          className={`pointer-events-none z-30 block origin-bottom-left ${className}`}>
          <span aria-hidden="true" className="absolute bottom-0 left-1 h-3 w-3 rotate-45 rounded-[2px] bg-white" />
          <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-[0_4px_10px_rgb(0_0_0/0.3)]">
            <EmoteFace emote={bubble.emote} size={34} />
          </span>
        </motion.span>
      ) : null}
    </AnimatePresence>
  );
}
