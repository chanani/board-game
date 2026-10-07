import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DiscardPairs } from './DiscardPairs';
import { card } from './oldMaidFixtures';

describe('DiscardPairs', () => {
  it('맨 위 짝을 앞면으로 보이고 버린 장수를 쓴다', () => {
    render(<DiscardPairs pairs={[[card('SPADES', 'TWO'), card('HEARTS', 'TWO')], [card('CLUBS', 'TEN'), card('DIAMONDS', 'TEN')]]} count={4} cardWidth={44} />);

    expect(screen.getByRole('group', { name: '버린 카드 4장, 맨 위 클로버 10·다이아몬드 10' })).toBeInTheDocument();
    expect(screen.getByText('버린 카드 4장')).toBeInTheDocument();
  });

  it('비어 있으면 빈 자리만', () => {
    render(<DiscardPairs pairs={[]} count={0} cardWidth={44} />);

    expect(screen.getByRole('group', { name: '버린 카드 없음' })).toBeInTheDocument();
  });
});
