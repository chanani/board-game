import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { BoardView } from '../../api/types';
import { PlayerBoard } from './PlayerBoard';

const board: BoardView = {
  playerId: 2,
  slots: [
    { column: 0, row: 0, faceUp: true, known: false, card: { kind: 'NUMBER', value: 7 } },
    { column: 1, row: 0, faceUp: false, known: false, card: null },
    { column: 2, row: 0, faceUp: true, known: false, card: { kind: 'WILD', value: 0 } },
    { column: 0, row: 1, faceUp: true, known: false, card: { kind: 'NUMBER', value: 7 } },
    { column: 1, row: 1, faceUp: false, known: false, card: null },
    { column: 2, row: 1, faceUp: true, known: false, card: { kind: 'NUMBER', value: 4 } },
  ],
};

describe('PlayerBoard', () => {
  it('0점 쌍인 열의 카드를 표시하고 상대의 뒷면 카드는 값이 없다', () => {
    render(<PlayerBoard board={board} nickname="밥" active={false} />);

    const slots = screen.getAllByTestId('slot');
    // 7/7 열만 0점 쌍. 오른쪽 위 와일드는 이웃이 가려진 칸뿐이라 복사할 값이 없어(0) 아래 4와 짝이 아니다.
    expect(slots.filter((slot) => slot.dataset.zeroPair === 'true')).toHaveLength(2);
    expect(screen.getAllByLabelText('뒷면 카드')).toHaveLength(2);
    expect(screen.getByText('밥')).toBeInTheDocument();
    expect(screen.queryByLabelText(/토큰/)).not.toBeInTheDocument();
  });
});
