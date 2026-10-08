import { AnimatePresence } from 'motion/react';
import type { Room } from '../api/types';
import { useRemaining } from '../components/Countdown';
import { StageCallout } from '../components/StageCallout';

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
 */
export function StartCountdownOverlay({ room }: { room: Room }) {
  const remaining = useRemaining(room.startsAt ?? null, room.serverNow);
  const number = countdownNumber(remaining);

  return (
    <AnimatePresence>
      {number !== null ? (
        <StageCallout key="start-countdown" testId="start-countdown" shoutTestId="start-countdown-number"
          label={`${number}초 뒤에 게임이 시작돼요`} above="곧 게임이 시작돼요" shoutKey={number} shout={number} />
      ) : null}
    </AnimatePresence>
  );
}
