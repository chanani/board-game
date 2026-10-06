import { useState } from 'react';
import type { BoardView, HeldView } from '../../../api/types';
import { OpponentBoardModal } from '../OpponentBoardModal';
import { estimateBoard } from '../score';
import { Seat, type Presence, type SeatSize } from './Seat';
import type { SeatTimer } from '../PlayerBoard';

type Props = {
  board: BoardView;
  nickname: string;
  active: boolean;
  held: HeldView | null;
  presence: Presence;
  handOverlay?: boolean;
  timer?: SeatTimer;
  size?: SeatSize;
  /** 가장 작은 테이블은 자리가 없어 예상 점수를 크게 보기 창에서만 보여준다. */
  showEstimate?: boolean;
};

/** 상대 자리: 판 전체를 덮는 버튼으로 크게 보기를 열고, 작은 판에도 예상 점수 배지를 단다. */
export function OpponentSeat({ board, nickname, active, held, presence, handOverlay = false, timer, size = 'sm', showEstimate = true }: Props) {
  const [open, setOpen] = useState(false);
  const { score } = estimateBoard(board);
  return (
    <div>
      <Seat board={board} nickname={nickname} active={active} held={held} size={size} presence={presence}
        handLabel={`${nickname}님이 들고 있는 카드`} onZoom={() => setOpen(true)} hand={handOverlay ? 'overlay' : 'side'} timer={timer} />
      {showEstimate ? <span data-testid="opponent-estimate" className="mt-1 block w-fit pill rounded-full px-2 py-0.5 text-xs font-bold">예상 {score}점</span> : null}
      <OpponentBoardModal open={open} board={board} nickname={nickname} presence={{ connected: presence.connected, offlineSeconds: presence.offlineSeconds }} onClose={() => setOpen(false)} />
    </div>
  );
}
