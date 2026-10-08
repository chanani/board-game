import type { BotDifficulty } from '../api/types';
import { botLabel, DIFFICULTY_SHORT } from '../lib/bots';
import { RobotIcon } from './icons';

const CHIP = 'inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-cream-50 px-2 py-0.5 text-[11px] font-bold leading-none text-wood-800 shadow';

/** 컴퓨터 표시 칩. compact는 로봇 + 난이도 한 글자(좁은 이름표 줄용). onClick이 있으면 난이도 바꾸기 버튼이 된다. */
export function BotChip({ difficulty, compact = false, onClick }: { difficulty: BotDifficulty; compact?: boolean; onClick?: () => void }) {
  const label = botLabel(difficulty);
  const body = compact ? DIFFICULTY_SHORT[difficulty] : label;
  if (onClick) {
    return (
      <button type="button" aria-label={`${label}, 난이도 바꾸기`} onClick={onClick}
        className={`${CHIP} cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-mustard-300`}>
        <RobotIcon className="h-3 w-3" />{body}
      </button>
    );
  }
  if (compact) {
    return <span role="img" aria-label={label} className={CHIP}><RobotIcon className="h-3 w-3" />{body}</span>;
  }
  return <span className={CHIP}><RobotIcon className="h-3 w-3" />{label}</span>;
}
