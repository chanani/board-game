import { AnimatePresence } from 'motion/react';
import { useEffect, useRef } from 'react';
import type { Room } from '../api/types';
import { useRemaining } from '../components/Countdown';
import { StageCallout } from '../components/StageCallout';
import { useSound } from '../lib/sound';

/** 남은 시간(ms)을 화면에 띄울 숫자로 바꾼다. 2.4초 남으면 3, 0.2초 남으면 1. 끝났거나 모르면 null. */
export function countdownNumber(remaining: number | null): number | null {
  if (remaining === null || remaining <= 0) {
    return null;
  }
  return Math.ceil(remaining / 1000);
}

/**
 * 카운트다운 소리: 숫자가 화면에 뜰 때마다 한 번(countdown), 게임이 실제로 시작되는 순간 한 번(gameStart).
 * - 숫자는 카운트다운(startsAt)마다 숫자 하나에 한 번만 울린다. 다시 그려지거나 StrictMode가 효과를 두 번 돌려도 겹치지 않는다.
 * - 도중에 들어오면 그때 떠 있는 숫자부터 울리고, 이미 지나간 숫자는 울리지 않는다.
 * - 시작음은 이 화면에서 카운트다운을 본 뒤 방이 게임 중으로 바뀔 때만 난다. 취소되면(대기실 그대로 startsAt만 사라짐) 나지 않고,
 *   내 시계가 먼저 0이 되어도 서버가 시작을 알리기 전에는 나지 않는다.
 * 소리 켜기/끄기·음량은 useSound가 따른다.
 */
function useCountdownSound(room: Room, number: number | null): void {
  const { play } = useSound();
  const playRef = useRef(play);
  playRef.current = play;
  const startsAt = room.startsAt ?? null;
  const playing = room.status === 'PLAYING';
  const soundedRef = useRef<{ startsAt: number; number: number } | null>(null);
  const countingRef = useRef(false);

  useEffect(() => {
    if (startsAt === null || number === null) {
      return;
    }
    // 같은 카운트다운에서는 숫자가 줄어들 때만 울린다(방 정보가 다시 와 시계가 조금 흔들려도 같은 숫자·지난 숫자는 다시 울리지 않는다).
    const last = soundedRef.current;
    if (last?.startsAt === startsAt && number >= last.number) {
      return;
    }
    soundedRef.current = { startsAt, number };
    playRef.current('countdown');
  }, [startsAt, number]);

  useEffect(() => {
    if (startsAt !== null) {
      countingRef.current = true;
      return;
    }
    const counted = countingRef.current;
    countingRef.current = false;
    if (counted && playing) {
      playRef.current('gameStart');
    }
  }, [startsAt, playing]);
}

/**
 * 방장이 시작을 누르면 방 안 모두(참가자·관전자)에게 가운데 큰 3 → 2 → 1을 보여 준다.
 * 서버가 준 startsAt에서 serverNow를 빼 남은 시간을 재므로 사람마다 시계가 달라도 같은 숫자를 본다.
 */
export function StartCountdownOverlay({ room }: { room: Room }) {
  const remaining = useRemaining(room.startsAt ?? null, room.serverNow);
  const number = countdownNumber(remaining);
  useCountdownSound(room, number);

  return (
    <AnimatePresence>
      {number !== null ? (
        <StageCallout key="start-countdown" testId="start-countdown" shoutTestId="start-countdown-number"
          label={`${number}초 뒤에 게임이 시작돼요`} above="곧 게임이 시작돼요" shoutKey={number} shout={number} />
      ) : null}
    </AnimatePresence>
  );
}
