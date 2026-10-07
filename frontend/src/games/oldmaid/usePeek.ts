import { useCallback, useEffect, useRef } from 'react';
import type { GameAction, GameSignal, OldMaidView } from '../../api/types';

/** 화면은 신호를 이 간격(ms)에 한 번까지 보낸다(초당 10번 이하, 스펙 R19). 서버의 50ms 간격(PeekState.MIN_GAP)보다 넉넉하다. */
export const PEEK_THROTTLE_MS = 100;

/** D16: 화면의 peek과 받은 신호 가운데 같은 판·같은 차례의 seq가 큰 쪽. 끝난 게임은 null. */
export function effectivePeek(game: OldMaidView, signal: GameSignal | null | undefined): number | null {
  if (game.status !== 'IN_PROGRESS' || !game.peek) {
    return null;
  }
  const fresh = Boolean(signal) && signal?.gameType === 'OLD_MAID' && signal.startedAt === game.startedAt
    && signal.turnSeq === game.turnSeq && signal.seq > game.peek.seq;
  return fresh && signal ? signal.index : game.peek.index;
}

/**
 * 고르는 자리 신호를 보낸다. 같은 자리는 다시 보내지 않고, 100ms 안에 여러 번 오면 마지막 값(null 포함)만 간격이 지난 뒤 보낸다(trailing).
 * 서버는 50ms 안의 신호를 버리므로 마지막 상태가 반드시 서버에 닿게 하려면 trailing이 빠지면 안 된다(Task 4 판정).
 * turnKey(판 시작 시각:차례 순번)가 바뀌면 서버가 신호를 지웠으므로 기억을 처음으로 돌린다.
 */
export function usePeekSender(send: ((action: GameAction) => void) | undefined, turnKey: string): (index: number | null) => void {
  const lastSent = useRef<number | null>(null);
  const lastAt = useRef(Number.NEGATIVE_INFINITY);
  const pending = useRef<{ index: number | null } | null>(null);
  const timer = useRef<number | null>(null);
  const sendRef = useRef(send);
  sendRef.current = send;

  const stop = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => {
    lastSent.current = null;
    pending.current = null;
    stop();
  }, [turnKey, stop]);
  useEffect(() => stop, [stop]);

  const flush = useCallback(() => {
    const next = pending.current;
    pending.current = null;
    if (!next || next.index === lastSent.current || !sendRef.current) {
      return;
    }
    lastSent.current = next.index;
    lastAt.current = Date.now();
    sendRef.current({ type: 'PEEK', index: next.index });
  }, []);

  return useCallback((index: number | null) => {
    pending.current = { index };
    const wait = lastAt.current + PEEK_THROTTLE_MS - Date.now();
    if (wait <= 0) {
      stop();
      flush();
      return;
    }
    if (timer.current === null) {
      timer.current = window.setTimeout(() => {
        timer.current = null;
        flush();
      }, wait);
    }
  }, [flush, stop]);
}
