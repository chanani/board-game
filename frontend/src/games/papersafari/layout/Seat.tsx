import type { BoardView, HeldView, SlotView } from '../../../api/types';
import { CardFace } from '../CardFace';
import { PlayerBoard, type SeatTimer } from '../PlayerBoard';
import { ZoneAnchor } from '../motion/ZoneAnchor';
import { handZone } from '../motion/zones';

export type SeatSize = 'xs' | 'sm' | 'md' | 'lg';

/** 들고 있는 카드 자리 크기: 큰 판은 md 카드, 가장 작은 판은 xs 카드, 나머지는 sm 카드. */
const HAND = { xs: { box: 'min-h-14 w-10', card: 'xs' }, sm: { box: 'min-h-[67px] w-12', card: 'sm' }, md: { box: 'min-h-[67px] w-12', card: 'sm' }, lg: { box: 'min-h-[90px] w-16', card: 'md' } } as const;

export type Presence = { connected?: boolean; offlineSeconds?: number; onForfeit?: () => void };

type Props = {
  board: BoardView;
  nickname: string;
  active: boolean;
  held: HeldView | null;
  size: SeatSize;
  presence: Presence;
  handLabel: string;
  onSlotClick?: (slot: SlotView) => void;
  canClick?: (slot: SlotView) => boolean;
  pulseSlots?: boolean;
  onZoom?: () => void;
  turnRing?: boolean;
  hand?: 'side' | 'overlay' | 'none';
  timer?: SeatTimer;
};

type HandProps = { board: BoardView; held: HeldView | null; size: SeatSize; handLabel: string; className?: string };

/** 들고 있는 카드가 놓이는 자리. 카드 비행 훅이 재는 `hand:<id>` 구역이라 플레이어마다 하나만 그린다. */
export function HandAnchor({ board, held, size, handLabel, className = '' }: HandProps) {
  const holding = held !== null && held.playerId === board.playerId;
  return (
    <ZoneAnchor zone={handZone(board.playerId)} className={`shrink-0 ${HAND[size].box} ${className}`}>
      {holding ? (
        <div className="-rotate-6 drop-shadow-xl" aria-label={handLabel}>
          <CardFace card={held.card} faceUp={held.card !== null} known={false} size={HAND[size].card} />
        </div>
      ) : null}
    </ZoneAnchor>
  );
}

/** side: 판 옆(기본), overlay: 판 오른쪽 위에 겹쳐 자리 너비를 판과 같게, none: 다른 곳에 따로 둔다. */
export function Seat({ board, nickname, active, held, size, presence, handLabel, onSlotClick, canClick, pulseSlots, onZoom, turnRing, hand = 'side', timer }: Props) {
  const handAnchor = <HandAnchor board={board} held={held} size={size} handLabel={handLabel} className={hand === 'overlay' ? 'pointer-events-none absolute top-6 right-0 z-[6]' : 'mt-6'} />;
  return (
    <div className={hand === 'side' ? 'relative flex items-start gap-2' : 'relative'}>
      <PlayerBoard board={board} nickname={nickname} active={active} turnRing={turnRing} size={size}
        onSlotClick={onSlotClick} canClick={canClick} pulseSlots={pulseSlots} onZoom={onZoom} zoomLabel={`${nickname}님의 판 크게 보기`} timer={timer} {...presence} />
      {hand === 'none' ? null : handAnchor}
    </div>
  );
}
