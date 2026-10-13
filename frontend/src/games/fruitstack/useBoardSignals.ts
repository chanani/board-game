import { useCallback, useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import type { GameAction, GameSignal } from '../../api/types';
import { BLEND_MS, BOARD_SIGNAL_MS, OUT_SIGNAL_MS, type BoardFrame } from './engine/constants';
import { blend } from './engine/interpolate';
import { decodeBoard, encodeBoard } from './engine/snapshot';

export type BoardSignalsOptions = {
  sendSignal?: (action: GameAction) => void;
  subscribeSignal?: (listener: (signal: GameSignal) => void) => () => void;
  startedAt: number; meId: number;
  /** 내 판(없으면 보내지 않는다). */
  getFrame: () => BoardFrame | null;
  out: boolean; active: boolean; now?: () => number;
};

type Received = { prev: BoardFrame | null; next: BoardFrame; at: number };

const shown = (entry: Received, at: number) => blend(entry.prev, entry.next, (at - entry.at) / BLEND_MS);

/** R22·R25: 내 판 모습을 보내고, 남의 판 모습을 받아 두 판 사이를 보간해 돌려준다. */
export function useBoardSignals(options: BoardSignalsOptions): { frameOf: (playerId: number) => BoardFrame | null } {
  const { subscribeSignal, startedAt, meId, out, active } = options;
  const reduced = useReducedMotion() ?? false;
  const latest = useRef({ ...options, reduced });
  latest.current = { ...options, reduced };
  const receivedRef = useRef(new Map<number, Received>());
  const clock = useCallback(() => (latest.current.now ?? Date.now)(), []);

  // R22 보내기. 끊겨 있으면 sendSignal이 조용히 버린다.
  const canSend = active && options.sendSignal !== undefined;
  useEffect(() => {
    if (!canSend) {
      return undefined;
    }
    const send = () => {
      const frame = latest.current.getFrame();
      if (frame) {
        latest.current.sendSignal?.({ type: 'BOARD', board: encodeBoard(frame) });
      }
    };
    if (out) {
      send(); // 탈락한 순간의 멈춘 판을 바로 알린다.
    }
    const timer = window.setInterval(send, out ? OUT_SIGNAL_MS : BOARD_SIGNAL_MS);
    return () => window.clearInterval(timer);
  }, [canSend, out]);

  // R25 받기.
  useEffect(() => {
    const received = receivedRef.current;
    received.clear();
    if (!subscribeSignal) {
      return undefined;
    }
    return subscribeSignal((signal) => {
      if (signal.gameType !== 'FRUIT_STACK' || signal.startedAt !== startedAt || signal.playerId === meId) {
        return;
      }
      const frame = decodeBoard(signal.board);
      if (!frame) {
        return;
      }
      const at = clock();
      const entry = received.get(signal.playerId);
      // 보간 도중에 새 판이 오면 지금 보이는 모습에서 이어 간다(튀지 않게).
      received.set(signal.playerId, { prev: entry ? shown(entry, at) : null, next: frame, at });
    });
  }, [subscribeSignal, startedAt, meId, clock]);

  const frameOf = useCallback((playerId: number) => {
    const entry = receivedRef.current.get(playerId);
    if (!entry) {
      return null;
    }
    return latest.current.reduced ? entry.next : shown(entry, clock());
  }, [clock]);

  return { frameOf };
}
