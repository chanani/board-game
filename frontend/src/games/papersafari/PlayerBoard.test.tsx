import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { BoardView } from '../../api/types';
import { setMediaMatches } from '../../test/media';
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

  it('모바일에서 연결 끊긴 사람의 내보내기는 이름표 옆 작은 X 버튼이다', async () => {
    setMediaMatches(false);
    const onForfeit = vi.fn();
    render(<PlayerBoard board={board} nickname="밥" active={false} connected={false} offlineSeconds={70} onForfeit={onForfeit} />);

    await userEvent.click(screen.getByRole('button', { name: '밥님 내보내기' }));

    expect(onForfeit).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: '내보내기' })).not.toBeInTheDocument();
  });
});
