import { useEffect, useState } from 'react';
import { recordsApi } from '../../api/records';
import type { MemberStats } from '../../api/types';

/**
 * 혼자 하기(스펙 12장)의 내 최고 점수. previous는 이번 판이 들어가기 전 값(처음이면 null).
 * fresh: 게임 중에 불러와 이번 판이 들어가지 않은 값인지. 끝난 뒤에 처음 불러왔으면(새로고침) 이번 판이 이미 들어 있을 수 있다.
 */
export type SoloBest = { previous: number | null; fresh: boolean };

type Options = { active: boolean; startedAt: number; inProgress: boolean; load?: () => Promise<MemberStats> };

/** 혼자 하는 내 게임이 열릴 때마다(startedAt) 한 번 불러온다. 못 불러오면 모르는 채로(null) 둔다. */
export function useSoloBest({ active, startedAt, inProgress, load = recordsApi.me }: Options): SoloBest | null {
  const [loaded, setLoaded] = useState<{ startedAt: number; best: SoloBest } | null>(null);
  const [inProgressAtOpen] = useState(() => new Map<number, boolean>());
  if (active && !inProgressAtOpen.has(startedAt)) {
    inProgressAtOpen.set(startedAt, inProgress);
  }
  const fresh = inProgressAtOpen.get(startedAt) ?? false;
  useEffect(() => {
    if (!active) {
      return undefined;
    }
    let cancelled = false;
    load()
      .then((stats) => {
        const previous = stats.stats.find((stat) => stat.gameType === 'FRUIT_STACK')?.bestSoloScore ?? null;
        if (!cancelled) {
          setLoaded({ startedAt, best: { previous, fresh } });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // 같은 게임 안에서는 다시 부르지 않는다(끝나도 이번 판 전 값을 쓴다).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, startedAt]);
  return active && loaded?.startedAt === startedAt ? loaded.best : null;
}
