import type { BoardView, HeldView, SlotView } from '../../../api/types';
import { CardFace } from '../CardFace';
import { PlayerBoard } from '../PlayerBoard';
import { ZoneAnchor } from '../motion/ZoneAnchor';
import { handZone } from '../motion/zones';

export type Presence = { connected?: boolean; offlineSeconds?: number; onForfeit?: () => void };

type Props = {
  board: BoardView;
  nickname: string;
  tokens: number;
  active: boolean;
  held: HeldView | null;
  size: 'sm' | 'md' | 'lg';
  presence: Presence;
  handLabel: string;
  onSlotClick?: (slot: SlotView) => void;
  canClick?: (slot: SlotView) => boolean;
  pulseSlots?: boolean;
};

export function Seat({ board, nickname, tokens, active, held, size, presence, handLabel, onSlotClick, canClick, pulseSlots }: Props) {
  const holding = held !== null && held.playerId === board.playerId;
  return (
    <div className="relative flex items-start gap-2">
      <PlayerBoard board={board} nickname={nickname} tokens={tokens} active={active} size={size}
        onSlotClick={onSlotClick} canClick={canClick} pulseSlots={pulseSlots} {...presence} />
      <ZoneAnchor zone={handZone(board.playerId)} className={`mt-6 shrink-0 ${size === 'lg' ? 'min-h-[90px] w-16' : 'min-h-[67px] w-12'}`}>
        {holding ? (
          <div className="-rotate-6 -translate-y-2 drop-shadow-xl" aria-label={handLabel}>
            <CardFace card={held.card} faceUp={held.card !== null} known={false} size={size === 'lg' ? 'md' : 'sm'} />
          </div>
        ) : null}
      </ZoneAnchor>
    </div>
  );
}
