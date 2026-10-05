import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { messageOf } from '../api/http';
import { useRealtime } from '../realtime/RealtimeContext';
import { useToast } from './Toast';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm ${isActive ? 'bg-safari-50 font-semibold text-safari-700' : 'text-stone-600 hover:bg-stone-100'}`;

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
      {disconnected ? (
        <div role="status" className="bg-amber-100 px-4 py-1.5 text-center text-sm text-amber-900">
          서버와 연결이 끊겼어요. 다시 연결하는 중…
        </div>
      ) : null}
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <span className="text-lg font-bold text-safari-700">🌿 보드게임 라운지</span>
            <nav className="flex gap-1">
              <NavLink to="/" end className={linkClass}>로비</NavLink>
              <NavLink to="/records" className={linkClass}>내 전적</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium">{member?.nickname}</span>
            <button type="button" onClick={handleLogout} className="text-stone-500 hover:text-stone-800">
              로그아웃
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
