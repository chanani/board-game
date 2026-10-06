import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, messageOf } from '../api/http';
import { roomsApi } from '../api/rooms';
import type { ApiErrorBody, GameAction, PaperSafariSessionView, PaperSafariView, Room } from '../api/types';
import { useToast } from '../components/Toast';
import { describeChanges, type LogEntry } from '../lib/eventLog';
import { useRealtime } from '../realtime/RealtimeContext';

const CHAT_ERROR_CODES = new Set(['INVALID_CHAT_MESSAGE', 'CHAT_TOO_FAST']);

const MAX_LOG = 5;
const SYNC_RETRY_MS = 1000;
const SYNC_MAX_TRIES = 5;
const POLL_MS = 5000;

type Options = { poll?: boolean };

const LEFT_MESSAGE = '방에서 나왔어요.';

// 방이 사라졌거나(404) 내가 더 이상 그 방에 없으면(403 NOT_IN_ROOM, 예: 오프라인 중 기권 처리) 다시 시도해도 소용없다.
const isRoomGone = (error: unknown) =>
  error instanceof ApiError && (error.status === 404 || error.code === 'NOT_IN_ROOM');

export type ViewTransition = { seq: number; from: PaperSafariView | null; to: PaperSafariView; animate: boolean };

export function useRoomChannel(code: string, { poll = false }: Options = {}) {
  const { realtime, connected } = useRealtime();
  const toast = useToast();
  const [room, setRoom] = useState<Room | null>(null);
  const [receivedAt, setReceivedAt] = useState(0);
  const [view, setView] = useState<PaperSafariSessionView | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [missing, setMissing] = useState(false);
  const [errorSeq, setErrorSeq] = useState(0);
  const [transition, setTransition] = useState<ViewTransition | null>(null);
  const viewRef = useRef<PaperSafariSessionView | null>(null);
  const syncPendingRef = useRef(false);
  const seqRef = useRef(0);
  const logIdRef = useRef(0);
  const roomRef = useRef<Room | null>(null);
  const topicSeenRef = useRef(0);
  const namesRef = useRef(new Map<number, string>());

  const acceptRoom = useCallback((next: Room) => {
    roomRef.current = next;
    next.members.forEach((member) => namesRef.current.set(member.id, member.nickname));
    setRoom(next);
    setReceivedAt(Date.now());
  }, []);

  const nicknameOf = useCallback(
    (memberId: number) => namesRef.current.get(memberId) ?? '떠난 플레이어',
    [],
  );

  const acceptView = useCallback(
    (next: PaperSafariSessionView) => {
      const lines = describeChanges(viewRef.current?.game ?? null, next.game, nicknameOf);
      const animate = !syncPendingRef.current;
      syncPendingRef.current = false;
      seqRef.current += 1;
      setTransition({ seq: seqRef.current, from: viewRef.current?.game ?? null, to: next.game, animate });
      viewRef.current = next;
      setView(next);
      if (lines.length > 0) {
        const at = Date.now();
        const entries = lines.map((line) => ({ ...line, id: ++logIdRef.current, at })).reverse();
        setLog((current) => [...entries, ...current].slice(0, MAX_LOG));
      }
    },
    [nicknameOf],
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
          acceptRoom(next);
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
        acceptRoom(body as Room);
      }),
      realtime.subscribe('/user/queue/game', (body) => acceptView(body as PaperSafariSessionView)),
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
        toast.show(error.message);
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
            acceptRoom(next);
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

  return { room, receivedAt, view, transition, log, missing, send, nicknameOf, errorSeq };
}
