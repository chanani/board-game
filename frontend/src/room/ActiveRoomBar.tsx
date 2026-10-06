import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { roomsApi } from '../api/rooms';
import type { Room } from '../api/types';

const POLL_MS = 5000;
const HIDDEN_PATHS = ['/login', '/signup'];

/** 방(참가·관전)에 있는 채로 다른 화면에 가 있으면, 그 방으로 돌아가는 바를 아래에 띄운다. */
export function ActiveRoomBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [found, setFound] = useState<{ room: Room | null; path: string }>({ room: null, path: pathname });

  useEffect(() => {
    let cancelled = false;
    let pending = false;
    const check = () => {
      if (pending) {
        return;
      }
      pending = true;
      roomsApi
        .mine()
        .then((next) => {
          if (!cancelled) {
            setFound({ room: next ?? null, path: pathname });
          }
        })
        .catch(() => undefined)
        .finally(() => { pending = false; });
    };
    check();
    const timer = window.setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [pathname]);

  const room = found.room;
  if (!room || HIDDEN_PATHS.includes(pathname)) {
    return null;
  }
  const roomPath = `/rooms/${room.code}`;
  // 방 화면에서 확인한 결과는 방을 나가는 순간 낡을 수 있으니, 새 경로에서 다시 확인할 때까지 띄우지 않는다.
  if (pathname === roomPath || found.path === roomPath) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <button type="button" onClick={() => navigate(roomPath)}
        className="wood-rail press-3d pointer-events-auto max-w-full truncate rounded-full border-2 border-mustard-400 px-5 py-2.5 text-sm font-bold text-cream-50">
        🎲 참여 중인 방으로 돌아가기 · <span className="text-mustard-300">{room.name}</span>
      </button>
    </div>
  );
}
