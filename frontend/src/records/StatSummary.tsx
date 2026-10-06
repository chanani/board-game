import type { GameStat } from '../api/types';
import { decimal, percent } from '../lib/format';
import { findGame } from '../games/registry';

function Row({ label, children }: { label: string; children: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-cream-300/70 py-1 last:border-b-0">
      <dt className="text-stone-600">{label}</dt>
      <dd className="font-bold">{children}</dd>
    </div>
  );
}

export function StatSummary({ stat }: { stat: GameStat }) {
  return (
    <div className="space-y-2 text-sm">
      <p className="font-bold">{stat.gameTypeName}</p>
      <div aria-hidden="true" className="flex h-4 overflow-hidden rounded-full bg-cream-300">
        {stat.matches === 0 ? null : (
          <>
            <div className="bg-safari-500 shadow-[inset_0_-3px_0_rgb(0_0_0/0.2)]" style={{ width: `${(stat.wins / stat.matches) * 100}%` }} />
            <div className="bg-mustard-400 shadow-[inset_0_-3px_0_rgb(0_0_0/0.2)]" style={{ width: `${(stat.draws / stat.matches) * 100}%` }} />
            <div className="bg-brick-500 shadow-[inset_0_-3px_0_rgb(0_0_0/0.2)]" style={{ width: `${(stat.losses / stat.matches) * 100}%` }} />
          </>
        )}
      </div>
      <dl>
        <Row label="게임">{`${stat.matches}전`}</Row>
        <Row label="승·무·패">{`${stat.wins}승 ${stat.draws}무 ${stat.losses}패`}</Row>
        <Row label="승률">{percent(stat.winRate)}</Row>
        <Row label={findGame(stat.gameType)?.averageScoreLabel ?? '평균 점수'}>{decimal(stat.averageRoundScore)}</Row>
      </dl>
    </div>
  );
}
