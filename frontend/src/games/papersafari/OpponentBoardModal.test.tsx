import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { BoardView } from '../../api/types';
import { OpponentBoardModal } from './OpponentBoardModal';

const board: BoardView = {
  playerId: 2,
  slots: [0, 1, 2].flatMap((column) => [0, 1].map((row) => (
    column === 0
      ? { column, row, faceUp: true, known: false, card: { kind: 'NUMBER' as const, value: row === 0 ? 3 : 4 } }
      : { column, row, faceUp: false, known: false, card: null }
  ))),
};

describe('OpponentBoardModal', () => {
  it('닉네임, 연결 상태, 예상 점수와 가려진 장수를 보여 준다', () => {
    render(<OpponentBoardModal open board={board} nickname="밥" tokens={2} presence={{ connected: false, offlineSeconds: 12 }} onClose={() => undefined} />);
    expect(screen.getByRole('dialog', { name: '밥님의 판' })).toBeInTheDocument();
    expect(screen.getByText(/연결 끊김 12초/)).toBeInTheDocument();
    expect(screen.getByText('예상 점수 7')).toBeInTheDocument();
    expect(screen.getByText('(+ 가려진 4장)')).toBeInTheDocument();
  });

  it('닫혀 있으면 아무것도 그리지 않는다', () => {
    render(<OpponentBoardModal open={false} board={board} nickname="밥" tokens={0} presence={{}} onClose={() => undefined} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
