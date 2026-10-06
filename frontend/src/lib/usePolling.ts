import { useEffect, useRef } from 'react';

/** 바로 한 번 부르고 intervalMs마다 다시 부른다. 이전 호출이 끝나지 않았으면 그 차례는 건너뛴다. */
export function usePolling(fn: () => Promise<void>, intervalMs: number) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let pending = false;
    const tick = () => {
      if (pending) {
        return;
      }
      pending = true;
      Promise.resolve(fnRef.current())
        .catch(() => undefined)
        .finally(() => { pending = false; });
    };
    tick();
    const timer = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
}
