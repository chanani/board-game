import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Realtime } from './Realtime';

type RealtimeState = { realtime: Realtime; connected: boolean };

const RealtimeContext = createContext<RealtimeState | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [realtime] = useState(() => new Realtime());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const off = realtime.onConnectionChange(setConnected);
    realtime.start();
    return () => {
      off();
      realtime.stop();
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
