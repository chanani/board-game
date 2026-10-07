import { useEffect, useRef, useState } from 'react';

export const FRESH_MS = 1200;

/** 이전 렌더에 없던 카드 id를 1.2초 동안 돌려준다(첫 렌더는 표시하지 않는다). */
export function useFreshIds(cards: { id: number }[]): Set<number> {
  const known = useRef<Set<number> | null>(null);
  const [fresh, setFresh] = useState<Set<number>>(new Set());
  const key = cards.map((card) => card.id).join(',');
  useEffect(() => {
    const ids = new Set(cards.map((card) => card.id));
    const previous = known.current;
    known.current = ids;
    if (previous === null) {
      return;
    }
    const added = new Set([...ids].filter((id) => !previous.has(id)));
    if (added.size === 0) {
      setFresh((current) => (current.size === 0 ? current : new Set()));
      return;
    }
    setFresh(added);
    const timer = setTimeout(() => setFresh(new Set()), FRESH_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return fresh;
}
