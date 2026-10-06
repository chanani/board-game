import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { NavLink, useLocation, useNavigate, useOutlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { messageOf } from '../api/http';
import { useSound } from '../lib/sound';
import { useRealtime } from '../realtime/RealtimeContext';
import { ActiveRoomBar } from '../room/ActiveRoomBar';
import { LogoMark } from './LogoMark';
import { GridIcon, LogoutIcon, SpeakerIcon, SpeakerMutedIcon, TrophyIcon } from './icons';
import { useToast } from './Toast';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-sm sm:px-3 ${isActive ? 'bg-black/30 font-bold text-cream-50' : 'text-cream-200 hover:bg-black/15'}`;

/** 좁은 화면(모바일)에서는 아이콘과 짧은 글자만, sm 이상에서는 원래 이름을 보인다. 접근 이름은 늘 원래 이름이다. */
function NavLabel({ full, short }: { full: string; short: string }) {
  return <><span className="hidden sm:inline">{full}</span><span aria-hidden="true" className="sm:hidden">{short}</span></>;
}

const INITIAL_GRACE_MS = 3000;

function useShowDisconnected(): boolean {
  const { connected } = useRealtime();
  const [everConnected, setEverConnected] = useState(connected);
  const [graceOver, setGraceOver] = useState(false);

  useEffect(() => {
    if (connected) {
      setEverConnected(true);
    }
  }, [connected]);

  useEffect(() => {
    const timer = window.setTimeout(() => setGraceOver(true), INITIAL_GRACE_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return !connected && (everConnected || graceOver);
}

export function Layout() {
  const { member, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const disconnected = useShowDisconnected();
  const location = useLocation();
  const outlet = useOutlet();
  const { muted, toggleMuted } = useSound();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      toast.show(messageOf(error));
    }
  };

  return (
    <div className="min-h-screen">
      <AnimatePresence>
        {disconnected ? (
          <motion.div role="status" initial={{ y: -40 }} animate={{ y: 0 }} exit={{ y: -40 }}
            className="sticky top-0 z-40 bg-mustard-400 px-4 py-1.5 text-center text-sm font-bold text-wood-800 shadow">
            서버와 연결이 끊겼어요. 다시 연결하는 중…
          </motion.div>
        ) : null}
      </AnimatePresence>
      <header className="wood-rail">
        <div className="mx-auto flex min-w-0 max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-4">
            <NavLink to="/" aria-label="보드게임 라운지" className="flex shrink-0 items-center gap-2 whitespace-nowrap text-lg font-black text-cream-50 drop-shadow">
              <LogoMark /><span className="hidden sm:inline">보드게임 라운지</span>
            </NavLink>
            <nav className="flex shrink-0 gap-0.5 sm:gap-1">
              <NavLink to="/" end aria-label="게임 목록" className={linkClass}><GridIcon /><NavLabel full="게임 목록" short="목록" /></NavLink>
              <NavLink to="/records" aria-label="내 전적" className={linkClass}><TrophyIcon /><NavLabel full="내 전적" short="전적" /></NavLink>
            </nav>
          </div>
          <div className="flex min-w-0 items-center gap-1.5 text-sm sm:gap-3">
            <button type="button" onClick={toggleMuted} aria-label={muted ? '소리 켜기' : '소리 끄기'}
              className="press-3d shrink-0 rounded-lg bg-black/25 px-2 py-1 text-cream-50">{muted ? <SpeakerMutedIcon /> : <SpeakerIcon />}</button>
            <span className="min-w-0 max-w-[4.5rem] truncate font-bold text-cream-50 sm:max-w-none">{member?.nickname}</span>
            <button type="button" onClick={handleLogout} aria-label="로그아웃"
              className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-1.5 py-1 text-cream-200 hover:text-cream-50">
              <LogoutIcon /><span className="hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            {outlet}
          </motion.div>
        </AnimatePresence>
      </main>
      <ActiveRoomBar />
    </div>
  );
}
