import type { Room } from '../api/types';
import { RobotIcon } from '../components/icons';

/** 컴퓨터가 낀 연습 경기의 결과 창 안내(R38). 연습 경기가 아니면 아무것도 그리지 않는다. */
export function PracticeNote({ room }: { room: Room }) {
  if (!room.practice) {
    return null;
  }
  return (
    <p data-testid="practice-note" className="flex items-center gap-1.5 text-xs font-bold text-wood-700">
      <RobotIcon className="h-4 w-4 shrink-0" />컴퓨터와 한 연습 경기라 전적에 넣지 않아요
    </p>
  );
}
