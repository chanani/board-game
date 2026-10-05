import type { BoardView, SlotView } from '../../api/types';
import { CardFace } from './CardFace';
import { cardAt, isZeroPair } from './score';

type Props = {
  board: BoardView;
  nickname: string;
  tokens: number;
  active: boolean;
  size?: 'sm' | 'md';
  onSlotClick?: (slot: SlotView) => void;
  canClick?: (slot: SlotView) => boolean;
};

const TOKENS_TO_WIN = 3;

export function PlayerBoard({ board, nickname, tokens, active, size = 'md', onSlotClick, canClick }: Props) {
  const ordered = [...board.slots].sort((a, b) => a.row - b.row || a.column - b.column);
  const zeroColumns = new Set(
    [0, 1, 2].filter((column) => isZeroPair(cardAt(board, column, 0), cardAt(board, column, 1))),
  );

  return (
    <div className={`rounded-2xl p-3 ${active ? 'bg-safari-50 ring-2 ring-safari-300' : 'bg-white ring-1 ring-stone-200'}`}>
      <div className="mb-2 flex items-center justify-between gap-2 text-sm">
        <span className="font-semibold">{nickname}</span>
        <span aria-label={`토큰 ${tokens}개`} className="tracking-widest text-safari-600">
          {'●'.repeat(Math.min(tokens, TOKENS_TO_WIN))}{'○'.repeat(Math.max(TOKENS_TO_WIN - tokens, 0))}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {ordered.map((slot) => {
          const clickable = Boolean(onSlotClick && canClick?.(slot));
          return (
            <div key={`${slot.column}-${slot.row}`} data-testid="slot" data-zero-pair={zeroColumns.has(slot.column)}>
              <CardFace
                card={slot.card}
                faceUp={slot.faceUp}
                known={slot.known}
                size={size}
                highlight={zeroColumns.has(slot.column)}
                onClick={clickable ? () => onSlotClick?.(slot) : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
