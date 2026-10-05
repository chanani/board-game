import { useCallback, useEffect, useRef, useState } from 'react';
import { messageOf } from '../api/http';
import { roomsApi } from '../api/rooms';
import type { ApiErrorBody, GameAction, PaperSafariSessionView, Room } from '../api/types';
import { useToast } from '../components/Toast';
import { describeChanges } from '../lib/eventLog';
import { useRealtime } from '../realtime/RealtimeContext';

const MAX_LOG = 5;
const SYNC_RETRY_MS = 1000;
const SYNC_MAX_TRIES = 5;

export function useRoomChannel(code: string) {
  const { realtime, connected } = useRealtime();
  const toast = useToast();
  const [room, setRoom] = useState<Room | null>(null);
  const [receivedAt, setReceivedAt] = useState(0);
  const [view, setView] = useState<PaperSafariSessionView | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [missing, setMissing] = useState(false);
  const viewRef = useRef<PaperSafariSessionView | null>(null);
  const roomRef = useRef<Room | null>(null);
  const topicSeenRef = useRef(0);

  const acceptRoom = useCallback((next: Room) => {
    roomRef.current = next;
    setRoom(next);
    setReceivedAt(Date.now());
  }, []);

  const nicknameOf = useCallback(
    (memberId: number) => roomRef.current?.members.find((member) => member.id === memberId)?.nickname ?? '떠난 플레이어',
    [],
  );

  const acceptView = useCallback(
    (next: PaperSafariSessionView) => {
      const lines = describeChanges(viewRef.current?.game ?? null, next.game, nicknameOf);
      viewRef.current = next;
      setView(next);
      if (lines.length > 0) {
        setLog((current) => [...lines.reverse(), ...current].slice(0, MAX_LOG));
      }
    },
    [nicknameOf],
  );

  useEffect(() => {
    viewRef.current = null;
    roomRef.current = null;
    setRoom(null);
    setView(null);
    setLog([]);
    setMissing(false);
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
        toast.show(messageOf(error));
        if (!roomRef.current) {
          setMissing(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [code, connected, acceptRoom, toast]);

  useEffect(() => {
    const offs = [
      realtime.subscribe(`/topic/rooms/${code}`, (body) => {
        topicSeenRef.current += 1;
        acceptRoom(body as Room);
      }),
      realtime.subscribe('/user/queue/game', (body) => acceptView(body as PaperSafariSessionView)),
      realtime.subscribe('/user/queue/errors', (body) => toast.show((body as ApiErrorBody).message)),
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

  const status = room?.status;
  useEffect(() => {
    if (status === 'PLAYING' && connected && !viewRef.current) {
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

  return { room, receivedAt, view, log, missing, send };
}
