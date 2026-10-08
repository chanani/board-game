import { useEffect, useRef } from 'react';
import type { Room } from '../api/types';
import { useToast } from '../components/Toast';

export const PRACTICE_START_MESSAGE = '컴퓨터가 함께하는 게임이라 승패가 전적에 들어가지 않아요';
const NOTICE_MS = 5000;

// 컴퓨터가 낀 게임이 막 시작되면 방 안 모두(참가자·관전자)에게 전적에 남지 않는다고 한 번 알린다.
// 게임 중에 들어온 사람에게는 띄우지 않는다(결과 창의 연습 경기 안내가 있다).
export function usePracticeStartNotice(room: Room | null): void {
  const toast = useToast();
  const previous = useRef<{ code: string; status: Room['status'] } | null>(null);

  useEffect(() => {
    if (!room) {
      return;
    }
    const before = previous.current;
    previous.current = { code: room.code, status: room.status };
    const started = before?.code === room.code && before.status !== 'PLAYING' && room.status === 'PLAYING';
    if (started && (room.practice || room.members.some((member) => member.bot))) {
      toast.show(PRACTICE_START_MESSAGE, 'info', NOTICE_MS);
    }
  }, [room, toast]);
}
