import type { ReactNode } from 'react';
import type { Room } from '../api/types';
import { BinocularsIcon, CardsIcon, CopyIcon, DotIcon, LockIcon, PeopleIcon } from './icons';
import { useToast } from './Toast';
import { Button } from './ui';

// 게임 중 칩은 테마의 상태 표시 색(원목은 초록)을 쓴다.
const CHIP_TONES = { plain: 'bg-black/35 text-cream-50', green: 'bg-(--plate-bg) text-(--plate-text)' } as const;

function RoomChip({ tone = 'plain', label, children }: { tone?: keyof typeof CHIP_TONES; label?: string; children: ReactNode }) {
  return (
    <span aria-label={label} className={`inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full border border-cream-50/20 px-1.5 py-0.5 text-[10px] font-bold sm:gap-1 sm:px-2.5 sm:text-xs [&_svg]:h-3 [&_svg]:w-3 sm:[&_svg]:h-3.5 sm:[&_svg]:w-3.5 ${CHIP_TONES[tone]}`}>{children}</span>
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
      className="pill press-3d flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold sm:px-2.5 sm:py-1 sm:text-xs">
      <span className="hidden font-sans sm:inline">코드</span> {code} <CopyIcon />
    </button>
  );
}

type Props = {
  room: Room;
  playing: boolean;
  onLeave: () => void;
};

/** 좁은 화면에서는 칩 글자를 아이콘으로 대신하고, 읽기 프로그램에는 그대로 읽힌다. */
function WideLabel({ children }: { children: ReactNode }) {
  return <span className="sr-only sm:not-sr-only">{children}</span>;
}

/**
 * 방 맨 위 상태 바. 첫 줄은 방 이름과 (대기 중) 코드 복사, 나가기. 둘째 줄은 칩을 줄바꿈 없이 한 줄에 두고,
 * 좁은 화면에서는 글씨와 아이콘을 줄여 360px 폭에서도 넘치지 않게 한다.
 */
export function RoomStatusBar({ room, playing, onLeave }: Props) {
  const spectatorCount = room.spectators.length;
  return (
    <div data-testid="room-status-bar" className="relative z-20 rounded-2xl border border-(--status-border) bg-(--status-bg) px-3 py-2 backdrop-blur-[2px]">
      <div data-testid="room-title-row" className="flex items-center gap-2">
        <h1 className="min-w-0 flex-1 truncate text-base font-black text-cream-50 drop-shadow sm:text-xl">{room.name}</h1>
        {playing ? null : <CodeChip code={room.code} />}
        <Button variant="danger" className="shrink-0 rounded-lg px-2.5 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm" onClick={onLeave}>나가기</Button>
      </div>
      <div className="mt-1 flex flex-nowrap items-center gap-1 overflow-hidden sm:gap-1.5" data-testid="room-chips">
        <RoomChip><CardsIcon /> {room.gameTypeName}</RoomChip>
        <RoomChip tone={playing ? 'green' : 'plain'}>{playing ? <><DotIcon className="h-3 w-3" /> 게임 중</> : '대기 중'}</RoomChip>
        <RoomChip label={`인원 ${room.members.length}/${room.maxPlayers}명`}><PeopleIcon /> {room.members.length}/{room.maxPlayers}명</RoomChip>
        {spectatorCount > 0 ? <RoomChip label={`관전 ${spectatorCount}명`}><BinocularsIcon /> <WideLabel>관전</WideLabel> {spectatorCount}</RoomChip> : null}
        {room.locked ? <RoomChip label="비공개"><LockIcon className="h-3.5 w-3.5" /> <WideLabel>비공개</WideLabel></RoomChip> : null}
      </div>
    </div>
  );
}
