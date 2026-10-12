import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { GameAction } from '../api/types';

/**
 * 보낸 행동에 이 시간 안에 새 화면도 오류도 오지 않으면 연결이 멈춘 것으로 본다.
 * 서버는 받아들인 행동마다 화면을, 거절한 행동마다 오류를 바로 돌려주므로 정상이면 수십~수백 ms 안에 답이 온다.
 * 게임 테이블의 보내기 잠금(3초)보다 짧아야, 잠금이 조용히 풀려 같은 행동이 멈춘 연결에 쌓이는 일이 없다.
 */
export const ACTION_ANSWER_MS = 2500;

const keyOf = (action: GameAction) => JSON.stringify(action);

/**
 * 보낸 게임 행동이 답(새 화면 또는 오류)을 받았는지 지켜본다.
 * - isWaiting: 같은 행동이 아직 답을 못 받았으면 true(또 보내지 않게).
 * - watch: 방금 보낸 행동을 지켜본다. 가장 먼저 보낸 행동부터 ACTION_ANSWER_MS 안에 답이 없으면 onUnanswered를 한 번 부른다.
 * - settle: 답이 왔거나(화면·오류) 연결이 끊겨 더 기다릴 것이 없을 때 부른다.
 */
export function useActionWatchdog(onUnanswered: () => void) {
  const waiting = useRef(new Set<string>());
  const timer = useRef<number | null>(null);
  const callback = useRef(onUnanswered);
  callback.current = onUnanswered;

  const settle = useCallback(() => {
    waiting.current.clear();
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const isWaiting = useCallback((action: GameAction) => waiting.current.has(keyOf(action)), []);

  const watch = useCallback((action: GameAction) => {
    waiting.current.add(keyOf(action));
    if (timer.current !== null) {
      return;
    }
    timer.current = window.setTimeout(() => {
      timer.current = null;
      waiting.current.clear();
      callback.current();
    }, ACTION_ANSWER_MS);
  }, []);

  useEffect(() => settle, [settle]);

  return useMemo(() => ({ isWaiting, watch, settle }), [isWaiting, watch, settle]);
}
