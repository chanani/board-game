import { useState } from 'react';
import type { BoardView, HeldView } from '../../../api/types';
import { OpponentBoardModal } from '../OpponentBoardModal';
import { estimateBoard } from '../score';
import { Seat, type Presence } from './Seat';

type Props = {
  board: BoardView;
  nickname: string;
  tokens: number;
  active: boolean;
  held: HeldView | null;
  presence: Presence;
};

/** 상대 자리: 판 전체를 덮는 버튼으로 크게 보기를 열고, 작은 판에도 예상 점수 배지를 단다. */
export function OpponentSeat({ board, nickname, tokens, active, held, presence }: Props) {
  const [open, setOpen] = useState(false);
  const { score } = estimateBoard(board);
  return (
    <div className="relative">
      <Seat board={board} nickname={nickname} tokens={tokens} active={active} held={held} size="sm" presence={presence}
        handLabel={`${nickname}님이 들고 있는 카드`} />
      <button type="button" aria-label={`${nickname}님의 판 크게 보기`} onClick={() => setOpen(true)}
        className="absolute inset-0 z-[5] cursor-zoom-in rounded-2xl focus-visible:outline-2 focus-visible:outline-mustard-400" />
      <span data-testid="opponent-estimate" className="mt-1 block w-fit rounded-full bg-black/35 px-2 py-0.5 text-xs font-bold text-cream-50">예상 {score}점</span>
      <OpponentBoardModal open={open} board={board} nickname={nickname} tokens={tokens} presence={presence} onClose={() => setOpen(false)} />
    </div>
  );
}
