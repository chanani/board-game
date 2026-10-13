import { useRemaining } from '../../components/Countdown';
import { RollingNumber } from '../../components/RollingNumber';
import { fruitName } from './engine/constants';
import { FruitIcon } from './FruitIcon';
import { FruitOrderChart } from './FruitOrderChart';
import { formatClock, formatScore } from './texts';

type Props = { score: number | null; next: number | null; deadline: number | null; serverNow: number; compact?: boolean; vertical?: boolean; locked?: boolean };

const URGENT_MS = 10_000;
const LABEL = 'text-[10px] font-bold whitespace-nowrap opacity-75';

/** 점수 띠: 내 점수, 다음 과일, 경기의 남은 시간, 과일 순서표를 여는 버튼. 관전자에게는 점수·다음 대신 "관전 중". */
export function Hud({ score, next, deadline, serverNow, compact = false, vertical = false, locked = false }: Props) {
  const remaining = useRemaining(deadline, serverNow);
  const urgent = remaining !== null && remaining <= URGENT_MS;
  const cell = vertical ? 'flex flex-col items-center gap-0.5' : 'flex items-center gap-1.5';
  const shape = vertical ? 'w-16 flex-col justify-center gap-3 rounded-2xl px-1 py-3' : `${compact ? 'h-7 gap-3 px-3 text-xs' : 'h-11 gap-4 px-4 text-sm'} flex-row justify-center rounded-full`;
  return (
    <div data-testid="fruit-hud" data-vertical={vertical ? 'true' : undefined} data-compact={compact ? 'true' : undefined}
      className={`pill inline-flex shrink-0 items-center font-black ${shape}`}>
      {score === null && next === null ? <span className={cell}>관전 중</span> : null}
      {score === null ? null : (
        <span className={cell}>
          <span className={LABEL}>점수</span>
          <span aria-live="polite" className="tabular-nums">
            {score < 1000 ? <RollingNumber value={score} /> : formatScore(score)}
          </span>
        </span>
      )}
      {next === null ? null : (
        <span className={cell}>
          <span className={LABEL}>다음</span>
          <FruitIcon level={next} size={compact ? 20 : 28} title={fruitName(next)} />
        </span>
      )}
      <span className={cell}>
        <span className={LABEL}>남은 시간</span>
        <span data-testid="match-clock" data-urgent={urgent ? 'true' : undefined} className={`tabular-nums ${urgent ? 'text-red-400' : ''}`}>{formatClock(remaining)}</span>
      </span>
      <FruitOrderChart shape={vertical ? 'rail' : compact ? 'compact' : 'pill'} locked={locked} />
    </div>
  );
}
