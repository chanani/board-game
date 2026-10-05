import type { GameStat } from '../api/types';
import { decimal, percent } from '../lib/format';

export function StatSummary({ stat }: { stat: GameStat }) {
  return (
    <div className="space-y-2 text-sm">
      <p className="font-bold">{stat.gameTypeName}</p>
      <p>
        게임 <strong>{stat.matches}전 {stat.wins}승 {stat.draws}무 {stat.losses}패</strong>
        <span className="ml-2 text-safari-700">승률 {percent(stat.winRate)}</span>
      </p>
      <p className="text-stone-600">
        라운드 {stat.rounds}판 {stat.roundWins}승 {stat.roundDraws}무 {stat.roundLosses}패 · 라운드 승률 {percent(stat.roundWinRate)} · 평균 점수{' '}
        {decimal(stat.averageRoundScore)}
      </p>
    </div>
  );
}
