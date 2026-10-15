import { useRemaining } from '../../components/Countdown';
import { RollingNumber } from '../../components/RollingNumber';
import { fruitName } from './engine/constants';
import { FruitIcon } from './FruitIcon';
import { FruitOrderChart } from './FruitOrderChart';
import { formatClock, formatScore } from './texts';

/**
 * best: 혼자 하기(스펙 12장)면 내 최고 점수(모르면 null)이고 남은 시간 대신 보인다. 대결은 undefined라 남은 시간을 보인다.
 */
type Props = { score: number | null; next: number | null; deadline: number | null; serverNow: number; compact?: boolean; vertical?: boolean; block?: boolean; locked?: boolean; best?: number | null };

const URGENT_MS = 10_000;
const LABEL = 'text-[10px] font-bold whitespace-nowrap opacity-75';

/**
 * 세로 휴대폰에서 작은 판 줄 옆에 놓는 점수 칸: 남은 폭을 다 쓰고, 좁으면 두 칸씩 두 줄, 넓으면(15rem부터) 네 칸 한 줄.
 * 칸마다 이름표 아래에 값을 두고 줄 높이를 없애, 두 줄일 때도 높이 72px(fit.ts의 SIDE_HUD_HEIGHT) 안에 든다.
 */
const BLOCK = '@container flex min-w-0 flex-1 self-center rounded-2xl px-1 py-1 text-sm leading-none';
const BLOCK_GRID = 'grid w-full grid-cols-2 items-center justify-items-center gap-1 @[15rem]:grid-cols-4';

/** 점수 띠: 내 점수, 다음 과일, 경기의 남은 시간(혼자 하기는 최고 점수), 과일 순서표를 여는 버튼. 관전자에게는 점수·다음 대신 "관전 중". */
export function Hud({ score, next, deadline, serverNow, compact = false, vertical = false, block = false, locked = false, best }: Props) {
  const solo = best !== undefined;
  const remaining = useRemaining(deadline, serverNow);
  const urgent = remaining !== null && remaining <= URGENT_MS;
  const stackedCell = block ? 'flex flex-col items-center gap-0.5 leading-none [&>span:first-child]:leading-none' : 'flex flex-col items-center gap-0.5';
  const cell = vertical || block ? stackedCell : 'flex items-center gap-1.5';
  const shape = vertical ? 'w-16 flex-col justify-center gap-3 rounded-2xl px-1 py-3' : `${compact ? 'h-7 gap-3 px-3 text-xs' : 'h-11 gap-4 px-4 text-sm'} flex-row justify-center rounded-full`;
  const cells = (
    <>
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
          <FruitIcon level={next} size={compact || block ? 20 : 28} title={fruitName(next)} />
        </span>
      )}
      {solo ? null : (
        <span className={cell}>
          <span className={LABEL}>남은 시간</span>
          <span data-testid="match-clock" data-urgent={urgent ? 'true' : undefined} className={`tabular-nums ${urgent ? 'text-red-400' : ''}`}>{formatClock(remaining)}</span>
        </span>
      )}
      {best === null || best === undefined ? null : (
        <span data-testid="solo-best" className={cell}>
          <span className={LABEL}>최고</span>
          <span className="tabular-nums">{formatScore(best)}</span>
        </span>
      )}
      <FruitOrderChart shape={vertical ? 'rail' : compact || block ? 'compact' : 'pill'} locked={locked} />
    </>
  );
  if (block) {
    return (
      <div data-testid="fruit-hud" data-block="true" className={`pill font-black ${BLOCK}`}>
        <div className={BLOCK_GRID}>{cells}</div>
      </div>
    );
  }
  return (
    <div data-testid="fruit-hud" data-vertical={vertical ? 'true' : undefined} data-compact={compact ? 'true' : undefined}
      className={`pill inline-flex shrink-0 items-center font-black ${shape}`}>
      {cells}
    </div>
  );
}
