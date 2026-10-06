import type { BoardView } from '../../api/types';
import { Felt } from '../../components/Felt';
import { Modal } from '../../components/Modal';
import { PlayerBoard } from './PlayerBoard';
import type { Presence } from './layout/Seat';
import { estimateBoard } from './score';

type Props = { board: BoardView; nickname: string; presence: Presence; open: boolean; onClose: () => void };

/** 상대 판을 크게 보여 준다. 예상 점수는 보이는 카드만으로 계산한다. */
export function OpponentBoardModal({ board, nickname, presence, open, onClose }: Props) {
  const { score, hidden } = estimateBoard(board);
  return (
    <Modal open={open} title={`${nickname}님의 판`} onClose={onClose}>
      <div className="text-center">
        <h2 className="mb-4 text-xl font-black">{nickname}님의 판</h2>
        <Felt className="flex justify-center p-3">
          <PlayerBoard board={board} nickname={nickname} active={false} size="lg" {...presence} />
        </Felt>
        <p className="mt-6 text-sm text-wood-800">
          <strong>예상 점수 {score}</strong>
          {hidden > 0 ? <span className="text-stone-500"> (+ 가려진 {hidden}장)</span> : null}
        </p>
      </div>
    </Modal>
  );
}
