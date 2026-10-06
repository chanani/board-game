import { Link } from 'react-router-dom';
import type { Ranking } from '../api/types';
import { percent } from '../lib/format';

/** 1~3위 메달 원판 색(금·은·동). */
const MEDAL_COLORS = ['bg-mustard-400 text-wood-800', 'bg-stone-300 text-wood-800', 'bg-[#e0b088] text-wood-800'];

function Medal({ rank }: { rank: number }) {
  const color = MEDAL_COLORS[rank - 1];
  if (!color) {
    return <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center text-sm font-black tabular-nums text-stone-500">{rank}</span>;
  }
  return (
    <span data-testid={`medal-${rank}`} aria-hidden="true" className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black tabular-nums shadow-[inset_0_-2px_0_rgb(0_0_0/0.15)] ${color}`}>
      {rank}
    </span>
  );
}

function share(count: number, total: number): string {
  return `${(count / total) * 100}%`;
}

function RecordBar({ ranking }: { ranking: Ranking }) {
  const label = `${ranking.wins}승 ${ranking.draws}무 ${ranking.losses}패`;
  const total = ranking.wins + ranking.draws + ranking.losses;
  return (
    <div className="min-w-0">
      <div role="img" aria-label={label} className="flex h-2 overflow-hidden rounded-full bg-stone-200">
        {total > 0 ? (
          <>
            <span className="block h-full bg-safari-500" style={{ width: share(ranking.wins, total) }} />
            <span className="block h-full bg-mustard-400" style={{ width: share(ranking.draws, total) }} />
            <span className="block h-full bg-brick-500" style={{ width: share(ranking.losses, total) }} />
          </>
        ) : null}
      </div>
      <p aria-hidden="true" className="mt-1 text-xs text-stone-500 tabular-nums">{label}</p>
    </div>
  );
}

/** 순위 한 줄. 넓으면 메달·닉네임·막대·승률 한 줄, 좁으면(목록 폭 24rem 미만) 막대가 닉네임 아래 줄로 내려간다. */
function RankingRow({ ranking }: { ranking: Ranking }) {
  const first = ranking.rank === 1 ? 'bg-amber-100' : 'hover:bg-cream-200/50';
  return (
    <li className={`grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-xl px-3 py-2.5 @sm:grid-cols-[1.75rem_minmax(0,1fr)_minmax(0,8.5rem)_4.5rem] ${first}`}>
      <span className="col-start-1 row-start-1">
        <Medal rank={ranking.rank} />
        <span className="sr-only">{ranking.rank}위</span>
      </span>
      <Link to={`/records/${ranking.memberId}`} className="col-start-2 row-start-1 truncate font-bold text-wood-800 hover:underline">{ranking.nickname}</Link>
      <span className="col-[2/4] row-start-2 @sm:col-[3/4] @sm:row-start-1">
        <RecordBar ranking={ranking} />
      </span>
      <span className="col-start-3 row-start-1 text-right text-lg font-black tabular-nums text-wood-800 @sm:col-start-4">
        {ranking.matches === 0 ? '-' : percent(ranking.winRate)}
      </span>
    </li>
  );
}

export function RankingList({ rankings, limit }: { rankings: Ranking[]; limit?: number }) {
  const shown = limit ? rankings.slice(0, limit) : rankings;
  if (shown.length === 0) {
    return <p className="text-sm text-stone-500">아직 5판 이상 플레이한 사람이 없어요.</p>;
  }
  return (
    <div className="@container">
      <ol className="space-y-1 text-sm">
        {shown.map((ranking) => <RankingRow key={ranking.memberId} ranking={ranking} />)}
      </ol>
    </div>
  );
}
