import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PlayingCard } from '../../api/types';
import { OLD_MAID_SIZES } from './layout';
import { MyHand } from './MyHand';
import { card, JOKER } from './oldMaidFixtures';

const sizes = OLD_MAID_SIZES.pc;
const RANKS = ['TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'JACK', 'QUEEN', 'KING', 'ACE'] as const;
const hand = (count: number): PlayingCard[] => Array.from({ length: count }, (_, index) => card(index % 2 === 0 ? 'SPADES' : 'HEARTS', RANKS[index % RANKS.length]));

describe('MyHand', () => {
  it('D13 서버 순서 그대로(정렬하지 않음) 앞면으로 보인다', () => {
    render(<MyHand cards={[card('HEARTS', 'SEVEN'), JOKER, card('SPADES', 'ACE')]} liftIndex={null} layout="pc" sizes={sizes} zoneId={1}
      canShuffle={false} shuffleLocked={false} onShuffle={vi.fn()} />);

    const hand = screen.getByRole('group', { name: '내 카드 3장' });
    expect(within(hand).getAllByRole('img').map((img) => img.getAttribute('aria-label'))).toEqual(['하트 7', '조커', '스페이드 A']);
  });

  it('남이 내 카드를 고르면 그 자리 카드가 들린다', () => {
    render(<MyHand cards={[card('HEARTS', 'SEVEN'), JOKER]} liftIndex={1} layout="pc" sizes={sizes} zoneId={1}
      canShuffle={false} shuffleLocked={false} onShuffle={vi.fn()} />);

    const cards = screen.getAllByTestId('my-card');
    expect(cards[1]).toHaveAttribute('data-lifted', 'true');
    expect(cards[0]).not.toHaveAttribute('data-lifted');
  });

  it('섞을 수 있을 때만 섞기 버튼이 있고 잠기면 누를 수 없다', async () => {
    const onShuffle = vi.fn();
    const { rerender } = render(<MyHand cards={[JOKER]} liftIndex={null} layout="pc" sizes={sizes} zoneId={1} canShuffle shuffleLocked={false} onShuffle={onShuffle} />);

    await userEvent.click(screen.getByRole('button', { name: '내 손패 섞기' }));
    expect(onShuffle).toHaveBeenCalledTimes(1);

    rerender(<MyHand cards={[JOKER]} liftIndex={null} layout="pc" sizes={sizes} zoneId={1} canShuffle shuffleLocked onShuffle={onShuffle} />);
    expect(screen.getByRole('button', { name: '내 손패 섞기' })).toBeDisabled();

    rerender(<MyHand cards={[JOKER]} liftIndex={null} layout="pc" sizes={sizes} zoneId={1} canShuffle={false} shuffleLocked={false} onShuffle={onShuffle} />);
    expect(screen.queryByRole('button', { name: '내 손패 섞기' })).not.toBeInTheDocument();
  });

  it('손패를 다 비웠으면 안내만 보인다', () => {
    render(<MyHand cards={[]} liftIndex={null} layout="pc" sizes={sizes} zoneId={1} canShuffle={false} shuffleLocked={false} onShuffle={vi.fn()} />);

    expect(screen.getByTestId('hand-empty')).toHaveTextContent('손패를 모두 비웠어요');
  });

  it('스펙 6.4 손패 줄 높이는 장수와 상관없이 같고 빈 손패도 같은 높이다', () => {
    const heightOf = (count: number) => {
      const { unmount } = render(<MyHand cards={hand(count)} liftIndex={null} layout="pc" sizes={sizes} zoneId={1} canShuffle={false} shuffleLocked={false} onShuffle={vi.fn()} />);
      const px = (testId: string) => parseFloat(screen.getByTestId(testId).style.height);
      // 손패가 있으면 섞기 버튼 자리 줄 + 손패 줄, 비면 그 둘을 합친 높이 하나.
      const height = count === 0 ? px('hand-empty') : px('shuffle-slot') + px('my-hand-row');
      unmount();
      return height;
    };

    const one = heightOf(1);
    expect(one).toBeGreaterThan(0);
    expect([heightOf(2), heightOf(5), heightOf(14), heightOf(0)]).toEqual([one, one, one, one]);
  });

  it('섞기 버튼은 손패와 겹치지 않게 따로 둔 자리(PC·세로는 위 줄, 눕힌 화면은 오른쪽 칸)에 있어 남이 카드를 들어도 움직이지 않는다', () => {
    const props = { cards: hand(7), sizes, zoneId: 1, shuffleLocked: false, onShuffle: vi.fn() };
    const { rerender } = render(<MyHand {...props} layout="pc" canShuffle liftIndex={null} />);
    const slot = screen.getByTestId('shuffle-slot');
    expect(slot).toHaveAttribute('data-placement', 'above');
    expect(slot.className).not.toContain('absolute');

    rerender(<MyHand {...props} layout="pc" canShuffle liftIndex={6} />);
    expect(screen.getByTestId('shuffle-slot')).toBe(slot);
    expect(within(slot).getByRole('button', { name: '내 손패 섞기' })).toBeInTheDocument();

    // 섞을 수 없을 때(내 차례)도 자리는 남겨 손패 줄 높이가 바뀌지 않는다.
    rerender(<MyHand {...props} layout="pc" canShuffle={false} liftIndex={null} />);
    expect(screen.getByTestId('shuffle-slot')).toBe(slot);
    expect(within(slot).queryByRole('button')).not.toBeInTheDocument();

    rerender(<MyHand {...props} layout="landscape" canShuffle liftIndex={6} />);
    expect(screen.getByTestId('shuffle-slot')).toHaveAttribute('data-placement', 'beside');
  });
});

