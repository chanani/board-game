import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PlayingCard } from '../../api/types';
import { OLD_MAID_SIZES } from './layout';
import { MyHand } from './MyHand';
import { card, JOKER } from './oldMaidFixtures';

const sizes = OLD_MAID_SIZES.pc;
const RANKS = ['TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'JACK', 'QUEEN', 'KING', 'ACE'] as const;
const hand = (count: number): PlayingCard[] => Array.from({ length: count }, (_, index) => card(index % 2 === 0 ? 'SPADES' : 'HEARTS', RANKS[index % RANKS.length]));

/** 손패 칸 600px, 섞기 버튼 자리 70px로 재는 ResizeObserver. */
function stubWidths() {
  vi.stubGlobal('ResizeObserver', class {
    constructor(private readonly callback: ResizeObserverCallback) {}
    observe(element: Element) {
      const width = element.getAttribute('data-testid') === 'my-hand' ? 600 : 70;
      this.callback([{ contentRect: { width } } as ResizeObserverEntry], this as unknown as ResizeObserver);
    }
    disconnect() {}
  });
}

afterEach(() => vi.unstubAllGlobals());

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
      const height = screen.getByTestId(count === 0 ? 'hand-empty' : 'my-hand-row').style.height;
      unmount();
      return height;
    };

    const one = heightOf(1);
    expect(one).toMatch(/px$/);
    expect([heightOf(2), heightOf(5), heightOf(14), heightOf(0)]).toEqual([one, one, one, one]);
  });

  it('섞기 버튼은 오른쪽 위에 있다가 남이 고르는 들린 카드에 닿으면 왼쪽으로 비킨다', () => {
    stubWidths();
    const props = { cards: hand(7), layout: 'pc' as const, sizes, zoneId: 1, canShuffle: true, shuffleLocked: false, onShuffle: vi.fn() };
    const { rerender } = render(<MyHand {...props} liftIndex={null} />);
    expect(screen.getByTestId('shuffle-slot')).toHaveAttribute('data-side', 'right');

    rerender(<MyHand {...props} liftIndex={6} />);
    expect(screen.getByTestId('shuffle-slot')).toHaveAttribute('data-side', 'left');

    rerender(<MyHand {...props} liftIndex={0} />);
    expect(screen.getByTestId('shuffle-slot')).toHaveAttribute('data-side', 'right');
  });
});

