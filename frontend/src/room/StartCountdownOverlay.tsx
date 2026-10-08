import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { Room } from '../api/types';
import { useRemaining } from '../components/Countdown';

/** 남은 시간(ms)을 화면에 띄울 숫자로 바꾼다. 2.4초 남으면 3, 0.2초 남으면 1. 끝났거나 모르면 null. */
export function countdownNumber(remaining: number | null): number | null {
  if (remaining === null || remaining <= 0) {
    return null;
  }
  return Math.ceil(remaining / 1000);
}

/**
 * 방장이 시작을 누르면 방 안 모두(참가자·관전자)에게 가운데 큰 3 → 2 → 1을 보여 준다.
 * 서버가 준 startsAt에서 serverNow를 빼 남은 시간을 재므로 사람마다 시계가 달라도 같은 숫자를 본다.
 * 화면을 막지 않아 그동안에도 나가기·채팅을 쓸 수 있다.
 */
export function StartCountdownOverlay({ room }: { room: Room }) {
  const remaining = useRemaining(room.startsAt ?? null, room.serverNow);
  const number = countdownNumber(remaining);
  const reduced = useReducedMotion();

  return (
    <AnimatePresence>
      {number !== null ? (
        <motion.div
          key="start-countdown"
          role="status"
          aria-live="assertive"
          aria-label={`${number}초 뒤에 게임이 시작돼요`}
          data-testid="start-countdown"
          className="pointer-events-none fixed inset-0 z-40 grid place-items-center bg-black/35 px-4 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex flex-col items-center gap-2">
            <p className="rounded-full border-2 border-mustard-400 bg-black/55 px-4 py-1 text-sm font-black tracking-wide text-mustard-200 sm:text-base">
              곧 게임이 시작돼요
            </p>
            <div className="relative grid h-44 w-44 place-items-center sm:h-56 sm:w-56">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={number}
                  data-testid="start-countdown-number"
                  className="col-start-1 row-start-1 text-[9rem] font-black leading-none text-mustard-300 drop-shadow-[0_6px_0_rgb(0_0_0_/_0.45)] sm:text-[12rem]"
                  initial={reduced ? { opacity: 0 } : { scale: 1.9, opacity: 0 }}
                  animate={reduced ? { opacity: 1 } : { scale: 1, opacity: 1 }}
                  exit={reduced ? { opacity: 0 } : { scale: 0.5, opacity: 0 }}
                  transition={reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 380, damping: 18 }}
                >
                  {number}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
