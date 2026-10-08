import type { BotDifficulty } from '../api/types';
import { BotChip } from './BotChip';

/**
 * 이름표 줄의 연결 표시 자리. 컴퓨터면 로봇 칩, 사람이면 연결 점, 둘 다 모르면 아무것도 그리지 않는다.
 * 칩은 점과 같은 줄에 들어가 자리 높이를 늘리지 않는다.
 */
export function PresenceMark({ connected, bot }: { connected?: boolean; bot?: BotDifficulty }) {
  if (bot) {
    return <BotChip difficulty={bot} compact />;
  }
  if (connected === undefined) {
    return null;
  }
  return <span aria-hidden="true" data-testid="presence-dot" className={`inline-block h-2 w-2 shrink-0 rounded-full ${connected ? 'bg-green-500' : 'bg-stone-400'}`} />;
}
