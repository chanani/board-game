import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, messageOf } from '../api/http';
import { roomsApi } from '../api/rooms';
import type { ApiErrorBody, GameAction, GameSignal, Room, SessionView } from '../api/types';
import { useToast } from '../components/Toast';
import { departures } from '../lib/departures';
import type { ViewTransition } from '../games/gameModule';
import { findGame, sessionGameType } from '../games/registry';
import { prependLog, type LogDraft, type LogEntry } from '../lib/eventLog';
import { useRealtime } from '../realtime/RealtimeContext';

// 여러 명이 동시에 잡기를 누르면 늦은 사람은 이 오류를 받는다. 정상 상황이라 알림을 띄우지 않는다(D25).
// 섞기를 빠르게 거듭 누르면 쿨다운 오류가 온다. 이것도 알림 없이 보내기 잠금만 푼다.
const QUIET_ERROR_CODES = new Set(['UNO_CATCH_CLOSED', 'OLD_MAID_SHUFFLE_TOO_FAST']);
const CHAT_ERROR_CODES = new Set(['INVALID_CHAT_MESSAGE', 'CHAT_TOO_FAST']);

const SYNC_RETRY_MS = 1000;
const SYNC_MAX_TRIES = 5;
const POLL_MS = 5000;

type Options = { poll?: boolean; meId?: number };

const LEFT_MESSAGE = '방에서 나왔어요.';

// 방이 사라졌거나(404) 내가 더 이상 그 방에 없으면(403 NOT_IN_ROOM, 예: 오프라인 중 기권 처리) 다시 시도해도 소용없다.
const isRoomGone = (error: unknown) =>
  error instanceof ApiError && (error.status === 404 || error.code === 'NOT_IN_ROOM');

export type { ViewTransition } from '../games/gameModule';

export function useRoomChannel(code: string, { poll = false, meId = 0 }: Options = {}) {
  const { realtime, connected } = useRealtime();
  const toast = useToast();
  const [room, setRoom] = useState<Room | null>(null);
  const [receivedAt, setReceivedAt] = useState(0);
  const [view, setView] = useState<SessionView | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [missing, setMissing] = useState(false);
  const [errorSeq, setErrorSeq] = useState(0);
  const [signal, setSignal] = useState<GameSignal | null>(null);
  const [transition, setTransition] = useState<ViewTransition<SessionView['game']> | null>(null);
  const viewRef = useRef<SessionView | null>(null);
  const syncPendingRef = useRef(false);
  const seqRef = useRef(0);
  const logIdRef = useRef(0);
  const roomRef = useRef<Room | null>(null);
  const topicSeenRef = useRef(0);
  const namesRef = useRef(new Map<number, string>());

  const appendLog = useCallback((lines: LogDraft[]) => {
    if (lines.length === 0) {
      return;
    }
    const at = Date.now();
    const entries = lines.map((line) => ({ ...line, id: ++logIdRef.current, at })).reverse();
    setLog((current) => prependLog(current, entries));
  }, []);

  const announceDepartures = useCallback(
    (prev: Room | null, next: Room) => {
      if (!prev || prev.code !== next.code || meId === 0) {
        return;
      }
      const left = departures(prev, next, meId);
      left.forEach(({ text }) => toast.show(text, 'info'));
      appendLog(left.map(({ memberId, text }) => ({ kind: 'leave', actorId: memberId, text })));
    },
    [meId, toast, appendLog],
  );

  /**
   * live: 방 방송으로 지금 받은 방. 다시 연결·관전 확인으로 REST에서 다시 가져온 방은 그사이 무슨 일이 있었는지 모르므로
   * (오래전에 나간 사람일 수 있다) 나간 사람 알림·진행 기록을 남기지 않는다.
   */
  const acceptRoom = useCallback(
    (next: Room, { live }: { live: boolean }) => {
      const prev = roomRef.current;
      roomRef.current = next;
      next.members.forEach((member) => namesRef.current.set(member.id, member.nickname));
      setRoom(next);
      setReceivedAt(Date.now());
      if (live) {
        announceDepartures(prev, next);
      }
    },
    [announceDepartures],
  );

  const nicknameOf = useCallback(
    (memberId: number) => namesRef.current.get(memberId) ?? '떠난 플레이어',
    [],
  );

  const acceptView = useCallback(
    (next: SessionView) => {
      const type = sessionGameType(next);
      const prev = viewRef.current;
      // 게임 종류가 다른 화면(오래된 화면이 섞여 온 경우)과는 비교하지 않는다.
      const from = prev !== null && sessionGameType(prev) === type ? prev : null;
      const lines = findGame(type)?.describeChanges(from, next, nicknameOf) ?? [];
      const animate = !syncPendingRef.current;
      syncPendingRef.current = false;
      seqRef.current += 1;
      setTransition({ seq: seqRef.current, from: from?.game ?? null, to: next.game, animate });
      viewRef.current = next;
      setView(next);
      appendLog(lines);
    },
    [nicknameOf, appendLog],
  );

  const showFailure = useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && error.code === 'NOT_IN_ROOM') {
        toast.show(LEFT_MESSAGE, 'info');
        return;
      }
      toast.show(messageOf(error));
    },
    [toast],
  );

  useEffect(() => {
    viewRef.current = null;
    roomRef.current = null;
    namesRef.current = new Map();
    setRoom(null);
    setView(null);
    setLog([]);
    setMissing(false);
    setTransition(null);
    syncPendingRef.current = false;
  }, [code]);

  useEffect(() => {
    if (!connected && roomRef.current) {
      return;
    }
    let cancelled = false;
    const seenBefore = topicSeenRef.current;
    roomsApi
      .get(code)
      .then((next) => {
        if (!cancelled && topicSeenRef.current === seenBefore) {
          acceptRoom(next, { live: false });
        }
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        showFailure(error);
        if (!roomRef.current || isRoomGone(error)) {
          setMissing(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [code, connected, acceptRoom, showFailure]);

  useEffect(() => {
    const offs = [
      realtime.subscribe(`/topic/rooms/${code}`, (body) => {
        topicSeenRef.current += 1;
        acceptRoom(body as Room, { live: true });
      }),
      realtime.subscribe('/user/queue/game', (body) => acceptView(body as SessionView)),
      realtime.subscribe('/user/queue/signal', (body) => setSignal(body as GameSignal)),
      realtime.subscribe('/user/queue/errors', (body) => {
        const error = body as ApiErrorBody;
        // 채팅 오류는 게임 행동과 무관하므로 카드 이동·중복 전송 방지를 풀지 않는다.
        if (!CHAT_ERROR_CODES.has(error.code)) {
          setErrorSeq((current) => current + 1);
        }
        if (error.code === 'NOT_IN_ROOM') {
          toast.show(LEFT_MESSAGE, 'info');
          setMissing(true);
          return;
        }
        if (!QUIET_ERROR_CODES.has(error.code)) {
          toast.show(error.message);
        }
        if (error.code === 'ROOM_NOT_FOUND') {
          setMissing(true);
        }
      }),
    ];
    return () => offs.forEach((off) => off());
  }, [code, realtime, acceptRoom, acceptView, toast]);

  useEffect(() => {
    if (!connected) {
      return;
    }
    let tries = 0;
    const sync = () => {
      tries += 1;
      syncPendingRef.current = true;
      realtime.publish(`/app/rooms/${code}/sync`, {});
    };
    sync();
    const timer = window.setInterval(() => {
      if (viewRef.current || tries >= SYNC_MAX_TRIES) {
        window.clearInterval(timer);
        return;
      }
      sync();
    }, SYNC_RETRY_MS);
    return () => window.clearInterval(timer);
  }, [code, connected, realtime]);

  useEffect(() => {
    if (!poll) {
      return undefined;
    }
    let cancelled = false;
    const timer = window.setInterval(() => {
      const seenBefore = topicSeenRef.current;
      roomsApi
        .get(code)
        .then((next) => {
          if (!cancelled && topicSeenRef.current === seenBefore) {
            acceptRoom(next, { live: false });
          }
        })
        .catch((error) => {
          if (!cancelled && isRoomGone(error)) {
            showFailure(error);
            setMissing(true);
          }
        });
    }, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [poll, code, acceptRoom, showFailure]);

  const status = room?.status;
  useEffect(() => {
    if (status === 'PLAYING' && connected && !viewRef.current) {
      syncPendingRef.current = true;
      realtime.publish(`/app/rooms/${code}/sync`, {});
    }
  }, [status, code, connected, realtime]);

  const send = useCallback(
    (action: GameAction) => {
      if (!realtime.publish(`/app/rooms/${code}/actions`, action)) {
        toast.show('연결이 끊겨 있어요. 잠시 후 다시 시도해 주세요.');
      }
    },
    [code, realtime, toast],
  );

  // 신호는 마우스 움직임마다 오가므로 끊겨 있으면 알림 없이 버린다(D15).
  const sendSignal = useCallback(
    (action: GameAction) => {
      realtime.publish(`/app/rooms/${code}/signals`, action);
    },
    [code, realtime],
  );

  return { room, receivedAt, view, transition, log, missing, send, sendSignal, signal, nicknameOf, errorSeq };
}
