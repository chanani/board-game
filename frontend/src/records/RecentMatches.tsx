import { Link } from 'react-router-dom';
import type { RecentMatch } from '../api/types';
import { dateTime, resultLabel } from '../lib/format';

export function RecentMatches({ matches, ownerId }: { matches: RecentMatch[]; ownerId: number }) {
  if (matches.length === 0) {
    return <p className="text-sm text-stone-500">아직 끝난 경기가 없어요.</p>;
  }
  return (
    <ul className="divide-y divide-stone-100 text-sm">
      {matches.map((match) => (
        <li key={match.matchId} className="flex flex-wrap items-center justify-between gap-2 py-2">
          <span className="w-24 text-stone-500">{dateTime(match.endedAt)}</span>
          <span className="flex-1">
            {match.players
              .filter((player) => player.memberId !== ownerId)
              .map((player, index) => (
                <span key={player.memberId}>
                  {index > 0 ? ', ' : 'vs '}
                  <Link to={`/records/${player.memberId}`} className="hover:underline">{player.nickname}</Link>
                </span>
              ))}
          </span>
          <span className={`w-10 font-bold ${match.result === 'WIN' ? 'text-safari-700' : 'text-stone-600'}`}>{resultLabel(match.result)}</span>
          <span className="w-28 text-xs text-stone-400">{match.rounds.map((round) => `${round.score}점`).join(' ')}</span>
        </li>
      ))}
    </ul>
  );
}
