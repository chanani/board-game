import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OLD_MAID_SIZES } from './layout';
import { MyHand } from './MyHand';
import { card, JOKER } from './oldMaidFixtures';

const sizes = OLD_MAID_SIZES.pc;

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
});
