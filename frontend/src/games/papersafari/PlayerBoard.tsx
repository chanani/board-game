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
  connected?: boolean;
  offlineSeconds?: number;
  onForfeit?: () => void;
};

const TOKENS_TO_WIN = 3;

export function PlayerBoard({ board, nickname, tokens, active, size = 'md', onSlotClick, canClick, connected, offlineSeconds = 0, onForfeit }: Props) {
  const ordered = [...board.slots].sort((a, b) => a.row - b.row || a.column - b.column);
  const zeroColumns = new Set(
    [0, 1, 2].filter((column) => isZeroPair(cardAt(board, column, 0), cardAt(board, column, 1))),
  );

  return (
    <div className={`rounded-2xl p-3 ${active ? 'bg-safari-50 ring-2 ring-safari-300' : 'bg-white ring-1 ring-stone-200'}`}>
      <div className="mb-2 flex items-center justify-between gap-2 text-sm">
        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
          {connected !== undefined ? (
            <span aria-hidden="true" className={`inline-block h-2 w-2 shrink-0 rounded-full ${connected ? 'bg-green-500' : 'bg-stone-400'}`} />
          ) : null}
          <span className="font-semibold">{nickname}</span>
          {connected === false ? <span className="text-xs text-stone-500">연결 끊김 {offlineSeconds}초</span> : null}
          {onForfeit ? (
            <button type="button" onClick={onForfeit} className="rounded-md bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700 hover:bg-red-100">
              내보내기
            </button>
          ) : null}
        </span>
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
