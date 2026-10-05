import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { NavLink, useLocation, useNavigate, useOutlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { messageOf } from '../api/http';
import { useSound } from '../lib/sound';
import { useRealtime } from '../realtime/RealtimeContext';
import { useToast } from './Toast';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm ${isActive ? 'bg-black/30 font-bold text-cream-50' : 'text-cream-200 hover:bg-black/15'}`;

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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-4">
            <NavLink to="/" className="text-lg font-black text-cream-50 drop-shadow">🌿 보드게임 라운지</NavLink>
            <nav className="flex gap-1">
              <NavLink to="/" end className={linkClass}>게임 선반</NavLink>
              <NavLink to="/records" className={linkClass}>내 전적</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <button type="button" onClick={toggleMuted} aria-label={muted ? '소리 켜기' : '소리 끄기'}
              className="press-3d rounded-lg bg-black/25 px-2 py-1 text-cream-50">{muted ? '🔇' : '🔊'}</button>
            <span className="font-bold text-cream-50">{member?.nickname}</span>
            <button type="button" onClick={handleLogout} className="text-cream-200 hover:text-cream-50">로그아웃</button>
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
    </div>
  );
}
