import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Realtime } from './Realtime';

type RealtimeState = { realtime: Realtime; connected: boolean };

const RealtimeContext = createContext<RealtimeState | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [realtime] = useState(() => new Realtime());
  const [connected, setConnected] = useState(false);
  const { sessionReplaced } = useAuth();

  useEffect(() => realtime.onSessionReplaced(sessionReplaced), [realtime, sessionReplaced]);

  useEffect(() => {
    const off = realtime.onConnectionChange(setConnected);
    realtime.start();
    return () => {
      off();
      realtime.stop();
    };
  }, [realtime]);

  // 휴대폰은 화면을 가리거나 전파가 바뀌면 소켓이 닫히지도 않은 채 멈춘다. 돌아왔을 때 바로 확인해 다시 연결하고,
  // 네트워크가 끊겼다는 것을 브라우저가 알면 하트비트를 기다리지 않고 바로 끊김 안내를 띄운다.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        realtime.recover();
      }
    };
    const onOnline = () => realtime.recover();
    const onOffline = () => realtime.reconnect();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [realtime]);

  const value = useMemo(() => ({ realtime, connected }), [realtime, connected]);
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): RealtimeState {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('RealtimeProvider 안에서만 쓸 수 있어요.');
  }
  return context;
}
