import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { messageOf } from '../api/http';
import { recordsApi } from '../api/records';
import type { GameType, MemberStats, Ranking, RecentMatch } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { Panel } from '../components/ui';
import { useToast } from '../components/Toast';
import { RankingList } from '../records/RankingList';
import { RecentMatches } from '../records/RecentMatches';
import { StatSummary } from '../records/StatSummary';
import { GAME_ORDER, gameOf } from '../games/registry';

type Tab = 'records' | 'ranking';

// 고르지 않은 게임 탭도 원목 배경 위에서 밝은 글자(대비 약 9:1)와 옅은 테두리로 또렷이 읽히게 한다.
const GAME_TAB_ON = 'bg-cream-50 text-wood-800 shadow ring-1 ring-inset ring-cream-50';
const GAME_TAB_OFF = 'bg-black/35 text-cream-50 ring-1 ring-inset ring-cream-50/45 hover:bg-black/45';

export function RecordsPage() {
  const params = useParams();
  const { member } = useAuth();
  const toast = useToast();
  const rawId = params.memberId;
  const memberId = rawId === undefined ? (member?.id ?? 0) : Number(rawId);
  const validId = rawId === undefined || (Number.isInteger(memberId) && memberId > 0);
  const isMe = rawId === undefined || memberId === member?.id;
  const [game, setGame] = useState<GameType>(GAME_ORDER[0]);
  const [tab, setTab] = useState<Tab>('records');
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [matches, setMatches] = useState<RecentMatch[]>([]);
  const [rankings, setRankings] = useState<Ranking[]>([]);

  useEffect(() => {
    setStats(null);
    if (!validId) {
      return;
    }
    let cancelled = false;
    const load = isMe ? recordsApi.me() : recordsApi.member(memberId);
    load.then((result) => { if (!cancelled) setStats(result); }).catch((error) => { if (!cancelled) toast.show(messageOf(error)); });
    return () => {
      cancelled = true;
    };
  }, [memberId, isMe, validId, toast]);

  useEffect(() => {
    setMatches([]);
    if (!validId) {
      return;
    }
    let cancelled = false;
    recordsApi.matches(memberId, game, 10)
      .then((result) => { if (!cancelled) setMatches(result); })
      .catch((error) => { if (!cancelled) toast.show(messageOf(error)); });
    return () => {
      cancelled = true;
    };
  }, [memberId, validId, game, toast]);

  useEffect(() => {
    setRankings([]);
    let cancelled = false;
    recordsApi.rankings(game)
      .then((result) => { if (!cancelled) setRankings(result); })
      .catch((error) => { if (!cancelled) toast.show(messageOf(error)); });
    return () => {
      cancelled = true;
    };
  }, [game, toast]);

  if (!validId) {
    return <Panel>잘못된 회원 주소예요.</Panel>;
  }

  const tabClass = (value: Tab) =>
    `rounded-lg px-3 py-1.5 text-sm ${tab === value ? 'bg-mustard-400 font-bold text-wood-800 shadow-[0_3px_0_var(--color-mustard-600)]' : 'bg-cream-50 text-wood-700'}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-cream-50 drop-shadow">{isMe ? '내 전적' : `${stats?.nickname ?? ''}님의 전적`}</h1>
        <div className="flex gap-2">
          <button type="button" className={tabClass('records')} onClick={() => setTab('records')}>전적</button>
          <button type="button" className={tabClass('ranking')} onClick={() => setTab('ranking')}>순위표</button>
        </div>
      </div>
      <div role="tablist" aria-label="게임" className="flex gap-2">
        {GAME_ORDER.map((type) => (
          <button key={type} type="button" role="tab" aria-selected={game === type} onClick={() => setGame(type)}
            className={`rounded-full px-3 py-1 text-sm font-bold ${game === type ? GAME_TAB_ON : GAME_TAB_OFF}`}>
            {gameOf(type).name}
          </button>
        ))}
      </div>
      {tab === 'records' ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {stats?.stats.map((stat) => (
              <Panel key={stat.gameType}>
                <StatSummary stat={stat} />
              </Panel>
            ))}
          </div>
          <Panel>
            <h2 className="mb-2 font-bold">최근 경기</h2>
            <RecentMatches matches={matches} ownerId={memberId} />
          </Panel>
        </>
      ) : (
        <Panel>
          <h2 className="mb-2 font-bold">{`${gameOf(game).name} 순위표 (5판 이상)`}</h2>
          <RankingList rankings={rankings} />
        </Panel>
      )}
    </div>
  );
}
