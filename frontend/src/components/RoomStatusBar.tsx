import type { ReactNode } from 'react';
import type { Room } from '../api/types';
import { BinocularsIcon, CardsIcon, CopyIcon, LockIcon, PeopleIcon } from './icons';
import { useToast } from './Toast';
import { Button } from './ui';

// 게임 중 칩은 테마의 상태 표시 색(원목은 초록)을 쓴다.
const CHIP_TONES = { plain: 'bg-black/35 text-cream-50', green: 'bg-(--plate-bg) text-(--plate-text)' } as const;

function RoomChip({ tone = 'plain', label, children }: { tone?: keyof typeof CHIP_TONES; label?: string; children: ReactNode }) {
  return (
    <span aria-label={label} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-cream-50/20 px-2 py-0.5 text-[11px] font-bold sm:px-2.5 sm:text-xs ${CHIP_TONES[tone]}`}>{children}</span>
  );
}

function CodeChip({ code }: { code: string }) {
  const toast = useToast();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.show('방 코드를 복사했어요.', 'info');
    } catch {
      toast.show(`방 코드: ${code}`, 'info');
    }
  };
  return (
    <button type="button" onClick={copy} aria-label={`방 코드 ${code} 복사`}
      className="pill press-3d flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 font-mono text-xs font-semibold">
      <span className="hidden font-sans sm:inline">코드</span> {code} <CopyIcon />
    </button>
  );
}

type Props = {
  room: Room;
  playing: boolean;
  onLeave: () => void;
  /** 게임 중 오른쪽에 두는 진행 기록 버튼. */
  log?: ReactNode;
};

/** 방 맨 위 상태 바: 방 이름 + 칩, 오른쪽에 코드 복사(대기 중) 또는 진행 기록(게임 중)과 나가기. */
export function RoomStatusBar({ room, playing, onLeave, log }: Props) {
  const spectatorCount = room.spectators.length;
  return (
    <div data-testid="room-status-bar" className="relative z-20 flex items-center justify-between gap-2 rounded-2xl border border-(--status-border) bg-(--status-bg) px-3 py-2 backdrop-blur-[2px] sm:gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-base font-black text-cream-50 drop-shadow sm:text-xl">{room.name}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-1 sm:gap-1.5" data-testid="room-chips">
          <RoomChip><CardsIcon /> {room.gameTypeName}</RoomChip>
          <RoomChip tone={playing ? 'green' : 'plain'}>{playing ? '● 게임 중' : '대기 중'}</RoomChip>
          <RoomChip label={`인원 ${room.members.length}/${room.maxPlayers}명`}><PeopleIcon /> {room.members.length}/{room.maxPlayers}명</RoomChip>
          {spectatorCount > 0 ? <RoomChip label={`관전 ${spectatorCount}명`}><BinocularsIcon /> 관전 {spectatorCount}</RoomChip> : null}
          {room.locked ? <RoomChip label="비공개"><LockIcon className="h-3.5 w-3.5" /> 비공개</RoomChip> : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {playing ? log : <CodeChip code={room.code} />}
        <Button variant="danger" className="shrink-0 px-3 py-1.5 sm:px-4 sm:py-2" onClick={onLeave}>나가기</Button>
      </div>
    </div>
  );
}
