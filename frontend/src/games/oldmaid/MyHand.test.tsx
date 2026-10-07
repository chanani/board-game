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

  it('R36 고를 수 있으면 카드가 버튼이고, 고른 카드는 들리며, 버리기 버튼은 준비됐을 때만 눌린다', async () => {
    const onToggle = vi.fn();
    const onDiscard = vi.fn();
    const picker = { selectedIds: [], glowIds: [], onToggle, label: '버리기', ready: false, hint: null, locked: false, onDiscard };
    const cards = [card('HEARTS', 'SEVEN'), JOKER, card('SPADES', 'SEVEN')];
    const { rerender } = render(<MyHand cards={cards} liftIndex={null} layout="pc" sizes={sizes} zoneId={1} canShuffle shuffleLocked={false} onShuffle={vi.fn()} picker={picker} />);

    await userEvent.click(screen.getByRole('button', { name: '하트 7 고르기' }));
    expect(onToggle).toHaveBeenCalledWith(cards[0].id);
    expect(screen.getByTestId('discard-button')).toBeDisabled();

    rerender(<MyHand cards={cards} liftIndex={null} layout="pc" sizes={sizes} zoneId={1} canShuffle shuffleLocked={false} onShuffle={vi.fn()}
      picker={{ ...picker, selectedIds: [cards[0].id, cards[2].id], ready: true }} />);
    expect(screen.getByRole('button', { name: '하트 7 고름' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByTestId('my-card')[0]).toHaveAttribute('data-selected', 'true');
    expect(screen.getAllByTestId('my-card')[0]).toHaveAttribute('data-lifted', 'true');
    screen.getByRole('button', { name: '스페이드 7 고름' }).focus();
    await userEvent.keyboard('{Enter}');
    expect(onToggle).toHaveBeenLastCalledWith(cards[2].id);
    await userEvent.click(screen.getByTestId('discard-button'));
    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('discard-button')).toHaveAttribute('data-no-click-sound');
    expect(screen.getByTestId('shuffle-slot')).toContainElement(screen.getByTestId('discard-button'));

    rerender(<MyHand cards={cards} liftIndex={null} layout="pc" sizes={sizes} zoneId={1} canShuffle shuffleLocked={false} onShuffle={vi.fn()}
      picker={{ ...picker, ready: true, locked: true }} />);
    expect(screen.getByTestId('discard-button')).toBeDisabled();
  });

  it('R36 짝이 아닌 두 장이면 짧은 안내, R37 뽑은 짝은 은은하게 빛난다', () => {
    const cards = [card('HEARTS', 'SEVEN'), JOKER, card('SPADES', 'SEVEN')];
    const picker = { selectedIds: [], glowIds: [cards[0].id, cards[2].id], onToggle: vi.fn(), label: '짝 버리기', ready: true, hint: '같은 숫자 두 장을 골라 주세요', locked: false, onDiscard: vi.fn() };
    render(<MyHand cards={cards} liftIndex={null} layout="pc" sizes={sizes} zoneId={1} canShuffle={false} shuffleLocked={false} onShuffle={vi.fn()} picker={picker} />);

    expect(screen.getByTestId('discard-hint')).toHaveTextContent('같은 숫자 두 장을 골라 주세요');
    expect(screen.getByTestId('discard-button')).toHaveTextContent('짝 버리기');
    expect(screen.getAllByTestId('my-card').map((one) => one.getAttribute('data-glow'))).toEqual(['true', null, 'true']);
  });

  it('고를 수 없으면 카드는 버튼이 아니고 버리기 버튼도 없다', () => {
    render(<MyHand cards={[JOKER]} liftIndex={null} layout="pc" sizes={sizes} zoneId={1} canShuffle={false} shuffleLocked={false} onShuffle={vi.fn()} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('discard-button')).not.toBeInTheDocument();
  });
});
