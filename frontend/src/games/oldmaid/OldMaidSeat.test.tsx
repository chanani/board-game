import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { OldMaidPlayerView } from '../../api/types';
import { OldMaidSeat } from './OldMaidSeat';

const player = (fields: Partial<OldMaidPlayerView> = {}): OldMaidPlayerView => ({ playerId: 2, cardCount: 3, rank: null, forfeited: false, ...fields });

describe('OldMaidSeat', () => {
  it('이름·장수·차례·뽑히는 중을 보이고 접근성 이름에 담는다', () => {
    render(<OldMaidSeat player={player()} nickname="밥" active targeted backWidth={30} maxBacks={7} liftIndex={null} />);

    const seat = screen.getByRole('group', { name: '밥, 카드 3장, 차례' });
    expect(within(seat).getByTestId('card-count')).toHaveTextContent('3장');
    expect(within(seat).getByTestId('turn-tag')).toHaveTextContent('차례');
    expect(within(seat).getByTestId('target-tag')).toHaveTextContent('뽑히는 중');
    expect(within(seat).getAllByTestId('seat-back')).toHaveLength(3);
  });

  it('뽑히는 중이면 신호 자리의 뒷면을 들어 올린다(그린 장수에 맞춰 옮김)', () => {
    const { rerender } = render(<OldMaidSeat player={player()} nickname="밥" active={false} targeted backWidth={30} maxBacks={7} liftIndex={1} />);
    expect(screen.getAllByTestId('seat-back')[1]).toHaveAttribute('data-lifted', 'true');

    rerender(<OldMaidSeat player={player({ cardCount: 14 })} nickname="밥" active={false} targeted backWidth={30} maxBacks={7} liftIndex={13} />);
    expect(screen.getAllByTestId('seat-back')).toHaveLength(7);
    expect(screen.getAllByTestId('seat-back')[6]).toHaveAttribute('data-lifted', 'true');

    rerender(<OldMaidSeat player={player()} nickname="밥" active={false} targeted={false} backWidth={30} maxBacks={7} liftIndex={1} />);
    expect(document.querySelector('[data-lifted="true"]')).toBeNull();
  });

  it('끝냈으면 등수, 도둑이면 가면 배지, 기권이면 기권', () => {
    const { rerender } = render(<OldMaidSeat player={player({ cardCount: 0, rank: 1 })} nickname="밥" active={false} targeted={false} backWidth={30} maxBacks={7} liftIndex={null} />);
    expect(screen.getByRole('group', { name: '밥, 카드 0장, 1등' })).toBeInTheDocument();
    expect(screen.getByTestId('rank-badge')).toHaveTextContent('1등');

    rerender(<OldMaidSeat player={player({ cardCount: 1, rank: 3 })} nickname="밥" active={false} targeted={false} backWidth={30} maxBacks={7} liftIndex={null} thief />);
    expect(screen.getByTestId('thief-badge')).toHaveTextContent('도둑');
    expect(screen.queryByTestId('rank-badge')).not.toBeInTheDocument();

    rerender(<OldMaidSeat player={player({ cardCount: 0, rank: 4, forfeited: true })} nickname="밥" active={false} targeted={false} backWidth={30} maxBacks={7} liftIndex={null} />);
    expect(screen.getByRole('group', { name: '밥, 카드 0장, 4등, 기권' })).toBeInTheDocument();
    expect(screen.getByTestId('forfeit-tag')).toHaveTextContent('기권');
  });
});
