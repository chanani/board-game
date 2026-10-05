import { Link } from 'react-router-dom';
import type { Ranking } from '../api/types';
import { percent } from '../lib/format';

export function RankingList({ rankings, limit }: { rankings: Ranking[]; limit?: number }) {
  const shown = limit ? rankings.slice(0, limit) : rankings;
  if (shown.length === 0) {
    return <p className="text-sm text-stone-500">아직 5판 이상 플레이한 사람이 없어요.</p>;
  }
  return (
    <ol className="space-y-1 text-sm">
      {shown.map((ranking) => (
        <li key={ranking.memberId} className="flex items-center justify-between rounded-lg px-2 py-1 hover:bg-stone-50">
          <span>
            <span className="mr-2 inline-block w-6 font-bold text-safari-700">{ranking.rank}</span>
            <Link to={`/records/${ranking.memberId}`} className="hover:underline">{ranking.nickname}</Link>
          </span>
          <span className="text-stone-500">
            {ranking.matches}전 {ranking.wins}승 · {percent(ranking.winRate)}
          </span>
        </li>
      ))}
    </ol>
  );
}
