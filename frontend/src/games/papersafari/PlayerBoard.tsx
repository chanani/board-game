import { useEffect, useRef } from 'react';
import type { BoardView, SlotView } from '../../api/types';
import { CardFace } from './CardFace';
import { ZoneAnchor } from './motion/ZoneAnchor';
import { slotZone } from './motion/zones';
import { cardAt, isZeroPair } from './score';

type Props = {
  board: BoardView;
  nickname: string;
  active: boolean;
  size?: 'sm' | 'md' | 'lg';
  pulseSlots?: boolean;
  onSlotClick?: (slot: SlotView) => void;
  canClick?: (slot: SlotView) => boolean;
  connected?: boolean;
  offlineSeconds?: number;
  onForfeit?: () => void;
  zoomLabel?: string;
  onZoom?: () => void;
};

const GAP = { sm: 'gap-1.5', md: 'gap-2.5', lg: 'gap-2.5' };

export function PlayerBoard({ board, nickname, active, size = 'md', pulseSlots = false, onSlotClick, canClick, connected, offlineSeconds = 0, onForfeit, zoomLabel, onZoom }: Props) {
  const ordered = [...board.slots].sort((a, b) => a.row - b.row || a.column - b.column);
  const zeroColumns = new Set(
    [0, 1, 2].filter((column) => isZeroPair(cardAt(board, column, 0), cardAt(board, column, 1))),
  );
  const previousZero = useRef<Set<number>>(zeroColumns);
  const fresh = new Set([...zeroColumns].filter((column) => !previousZero.current.has(column)));
  useEffect(() => {
    previousZero.current = zeroColumns;
  });

  return (
    <div className="rounded-2xl bg-black/15 p-2 backdrop-blur-[1px]">
      <div className="mb-2 flex items-center justify-between gap-2 text-sm">
        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
          {connected !== undefined ? (
            <span aria-hidden="true" className={`inline-block h-2 w-2 shrink-0 rounded-full ${connected ? 'bg-green-500' : 'bg-stone-400'}`} />
          ) : null}
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold text-wood-800 shadow-[0_2px_0_rgb(0_0_0/0.3)] ${active ? 'turn-glow bg-mustard-400' : 'bg-cream-50'}`}>{nickname}</span>
          {connected === false ? <span className="text-xs text-cream-100">연결 끊김 {offlineSeconds}초</span> : null}
          {onForfeit ? (
            <button type="button" onClick={onForfeit} className="rounded-md bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700 hover:bg-red-100">
              내보내기
            </button>
          ) : null}
        </span>
      </div>
      <div className={`relative grid grid-cols-3 ${GAP[size]}`}>
        {onZoom ? (
          <button type="button" aria-label={zoomLabel} onClick={onZoom}
            className="absolute inset-0 z-[5] cursor-zoom-in rounded-xl focus-visible:outline-2 focus-visible:outline-mustard-400" />
        ) : null}
        {ordered.map((slot) => {
          const clickable = Boolean(onSlotClick && canClick?.(slot));
          return (
            <ZoneAnchor key={`${slot.column}-${slot.row}`} zone={slotZone(board.playerId, slot.column, slot.row)}>
              <div data-testid="slot" data-zero-pair={zeroColumns.has(slot.column)}>
                <CardFace card={slot.card} faceUp={slot.faceUp} known={slot.known} size={size}
                  highlight={zeroColumns.has(slot.column)} pulse={clickable && pulseSlots}
                  sparkle={fresh.has(slot.column)}
                  onClick={clickable ? () => onSlotClick?.(slot) : undefined} />
              </div>
            </ZoneAnchor>
          );
        })}
      </div>
    </div>
  );
}
