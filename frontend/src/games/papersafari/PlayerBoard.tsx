import { useEffect, useRef } from 'react';
import type { BoardView, SlotView } from '../../api/types';
import { Countdown } from '../../components/Countdown';
import { CardFace, type CardSize } from './CardFace';
import { ZoneAnchor } from './motion/ZoneAnchor';
import { slotZone } from './motion/zones';
import { CrownIcon } from '../../components/icons';
import { zeroPairColumns } from './score';

/** 결과 화면용: 이름표 글, 합계, 열 점수 배지(없으면 '…'), 승자 강조. */
/** 이 사람의 행동을 기다리는 마감(서버 시계). 5초 이하부터 이름표 옆에 작게 보인다. */
export type SeatTimer = { deadline: number | null | undefined; serverNow: number | undefined };

/** notes: 열마다 와일드가 복사한 값 안내("와일드 → -2", 없으면 빈 글). */
export type BoardResult = { tag: string; total: string; badges: string[]; notes?: string[]; winner: boolean };

type Props = {
  result?: BoardResult;
  board: BoardView;
  nickname: string;
  active: boolean;
  /** 내 차례일 때 판 테두리 안쪽에 겨자색 링과 빛을 단다(바깥으로 번지지 않아 위 정보를 덮지 않는다). */
  turnRing?: boolean;
  size?: CardSize;
  pulseSlots?: boolean;
  onSlotClick?: (slot: SlotView) => void;
  canClick?: (slot: SlotView) => boolean;
  connected?: boolean;
  offlineSeconds?: number;
  zoomLabel?: string;
  onZoom?: () => void;
  timer?: SeatTimer;
};

/** 작은 판(mini·xs)은 카드 격자 폭에 맞춰(w-min) 연결 끊김 같은 글씨가 판을 넓히지 않고 줄바꿈되게 한다.
 * 가장 작은 판은 여백과 이름표도 줄여, 세로 휴대폰 둥근 테이블의 한 줄(상대·덱·상대)에 들어가게 한다. */
const PAD = { mini: 'p-1 w-min', xs: 'p-2 w-min', sm: 'p-2', md: 'p-2', lg: 'p-2' };
/** grid-cols-3은 minmax(0,1fr)이라 w-min 판에서 열이 0까지 줄어 카드가 겹친다. 작은 판은 카드 폭 그대로인 auto 열을 쓴다. */
const COLUMNS = { mini: 'grid-cols-[repeat(3,auto)]', xs: 'grid-cols-[repeat(3,auto)]', sm: 'grid-cols-3', md: 'grid-cols-3', lg: 'grid-cols-3' };
const GAP = { mini: 'gap-0.5', xs: 'gap-1', sm: 'gap-1.5', md: 'gap-2.5', lg: 'gap-2.5' };

export function PlayerBoard({ result, board, nickname, active, turnRing = false, size = 'md', pulseSlots = false, onSlotClick, canClick, connected, offlineSeconds = 0, zoomLabel, onZoom, timer }: Props) {
  const ordered = [...board.slots].sort((a, b) => a.row - b.row || a.column - b.column);
  const zeroColumns = new Set(zeroPairColumns(board));
  const previousZero = useRef<Set<number>>(zeroColumns);
  const fresh = new Set([...zeroColumns].filter((column) => !previousZero.current.has(column)));
  useEffect(() => {
    previousZero.current = zeroColumns;
  });

  return (
    <div data-testid={`board-${board.playerId}`} data-winner={result ? result.winner : undefined}
      className={`rounded-2xl bg-black/15 ${PAD[size]} backdrop-blur-[1px] ${result ? 'mx-auto w-fit' : ''} ${turnRing ? 'ring-[3px] ring-inset ring-(--turn-ring) turn-ring' : ''} ${result?.winner ? 'ring-[3px] ring-mustard-400 shadow-[0_0_18px_rgb(242_179_61/0.7)]' : ''}`}>
      <div className={`flex items-center justify-between gap-2 text-sm ${size === 'mini' ? 'mb-1' : 'mb-2'}`}>
        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
          {connected !== undefined ? (
            <span aria-hidden="true" className={`inline-block h-2 w-2 shrink-0 rounded-full ${connected ? 'bg-green-500' : 'bg-stone-400'}`} />
          ) : null}
          <span className={`rounded-full py-0.5 font-bold ${size === 'mini' ? 'inline-block max-w-[5.5rem] truncate px-1.5 align-middle text-[10px]' : 'px-2.5 text-xs'} shadow-[0_2px_0_rgb(0_0_0/0.3)] ${active ? 'turn-glow bg-(--turn-tag-bg) text-(--turn-tag-ink)' : 'bg-cream-50 text-wood-800'}`}>{result?.winner ? <CrownIcon className="mr-1 inline h-3.5 w-3.5 align-[-2px]" testId="winner-crown" /> : null}{result ? result.tag : nickname}</span>
          {timer ? <Countdown size="sm" deadline={timer.deadline} serverNow={timer.serverNow} /> : null}
          {connected === false ? <span className="felt-ink text-xs">연결 끊김 {offlineSeconds}초</span> : null}
        </span>
        {result ? <b data-testid="board-total" className="felt-ink shrink-0 text-xs">{result.total}</b> : null}
      </div>
      <div data-testid="board-grid" className={`relative grid ${result ? 'grid-cols-[repeat(3,auto)] justify-center gap-x-4 gap-y-2' : `${COLUMNS[size]} ${GAP[size]}`}`}>
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
        {result?.badges.map((badge, column) => (
          <span key={`badge-${column}`} data-testid="column-badge"
            className={`justify-self-center rounded-md px-2 py-0.5 text-xs font-extrabold ${badge === '0' ? 'bg-green-200 text-green-800' : 'bg-cream-50 text-wood-800'}`}>
            {badge}
          </span>
        ))}
        {result?.notes?.some(Boolean) && result.notes.map((note, column) => (
          <span key={`note-${column}`} data-testid="wild-note" className="felt-ink -mt-1.5 justify-self-center whitespace-nowrap text-[10px] font-bold leading-none">
            {note}
          </span>
        ))}
      </div>
    </div>
  );
}
