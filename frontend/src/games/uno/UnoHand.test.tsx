import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UnoCard } from '../../api/types';
import { setMediaMatches } from '../../test/media';
import { fanOverhang, fanUnderhang, HAND_GLOW, handSpacing, PC_TALL_QUERY, UNO_PC_SHORT_SIZES, UNO_SIZES } from './layout';
import { UnoHand } from './UnoHand';
import { drawTwo, num, skip, wild } from './unoFixtures';

const CARDS: UnoCard[] = [wild(100), num('BLUE', 7, 88), skip('RED', 19), num('RED', 2, 3)];

function renderHand(props: Partial<Parameters<typeof UnoHand>[0]> = {}) {
  const onPlay = vi.fn();
  const view = render(<UnoHand cards={CARDS} playableIds={[3, 19, 100]} myTurn layout="pc" zoneId={1} onPlay={onPlay} {...props} />);
  return { onPlay, ...view };
}

const labels = () => screen.getAllByTestId('hand-card').map((card) => card.getAttribute('aria-label'));

afterEach(() => vi.useRealTimers());

describe('UnoHand', () => {
  it('색 → 종류 순으로 정렬하고 장수를 알린다', () => {
    renderHand();

    expect(screen.getByRole('group', { name: '내 카드 4장' })).toBeInTheDocument();
    expect(labels()).toEqual(['빨강 2, 낼 수 있어요', '빨강 건너뛰기, 낼 수 있어요', '파랑 7', '와일드, 낼 수 있어요']);
  });

  it.each(['pc', 'portrait', 'landscape'] as const)('%s 부채꼴의 가장자리 카드가 줄 아래로 넘치지 않는다', (layout) => {
    renderHand({ layout, cards: [...CARDS, num('GREEN', 1, 51), num('GREEN', 2, 52), num('YELLOW', 3, 27), drawTwo('BLUE', 98), num('BLUE', 9, 96)] });

    const inner = screen.getByTestId('uno-hand').firstElementChild as HTMLElement;
    const bottoms = screen.getAllByTestId('hand-card').map((card) => {
      const drop = Number(/translateY\((-?[\d.]+)px\)/.exec(card.style.transform)?.[1] ?? 0);
      const angle = Number(card.getAttribute('data-angle'));
      return parseFloat(card.style.top) + parseFloat(card.style.height) + drop + fanUnderhang(parseFloat(card.style.width), angle);
    });
    expect(parseFloat(inner.style.height)).toBeGreaterThanOrEqual(Math.max(...bottoms) + 4);
  });

  it('내 차례에는 낼 수 있는 카드를 들고 나머지는 흐리게 한다', () => {
    renderHand();

    const [red2, , blue7] = screen.getAllByTestId('hand-card');
    expect(red2).toHaveAttribute('data-lifted', 'true');
    expect(blue7).toHaveAttribute('aria-disabled', 'true');
    expect(blue7).not.toHaveAttribute('data-lifted');
  });

  it('남의 차례에는 모두 보통 밝기이고 눌러도 내지 않는다', async () => {
    const { onPlay } = renderHand({ myTurn: false, playableIds: [] });

    screen.getAllByTestId('hand-card').forEach((card) => expect(card).not.toHaveAttribute('aria-disabled'));
    await userEvent.click(screen.getAllByTestId('hand-card')[0]);
    expect(onPlay).not.toHaveBeenCalled();
  });

  it('정밀 포인터는 낼 수 있는 카드를 한 번 누르면 바로 낸다', async () => {
    setMediaMatches(true);
    const { onPlay } = renderHand();

    await userEvent.click(screen.getByRole('button', { name: '빨강 2, 낼 수 있어요' }));
    await userEvent.click(screen.getByRole('button', { name: '파랑 7' }));

    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(onPlay).toHaveBeenCalledWith(num('RED', 2, 3));
  });

  it('터치는 한 번 누르면 들어 올리고 내기 버튼이나 같은 카드를 다시 누르면 낸다', async () => {
    setMediaMatches((query) => query !== '(pointer: fine)');
    const { onPlay } = renderHand();
    const red2 = screen.getByRole('button', { name: '빨강 2, 낼 수 있어요' });

    await userEvent.click(red2);
    expect(onPlay).not.toHaveBeenCalled();
    expect(red2).toHaveAttribute('data-selected', 'true');
    expect(red2).toHaveAttribute('aria-pressed', 'true');
    expect(red2.nextElementSibling).toBe(screen.getByRole('button', { name: '빨강 2 내기' }));
    await userEvent.click(screen.getByRole('button', { name: '빨강 2 내기' }));
    expect(onPlay).toHaveBeenCalledWith(num('RED', 2, 3));

    await userEvent.click(screen.getByRole('button', { name: '빨강 건너뛰기, 낼 수 있어요' }));
    await userEvent.click(screen.getByRole('button', { name: '빨강 건너뛰기, 낼 수 있어요' }));
    expect(onPlay).toHaveBeenLastCalledWith(skip('RED', 19));
  });

  it('터치로 고른 뒤 다른 곳을 누르면 선택을 취소한다', async () => {
    setMediaMatches((query) => query !== '(pointer: fine)');
    renderHand();
    const red2 = screen.getByRole('button', { name: '빨강 2, 낼 수 있어요' });
    await userEvent.click(red2);

    await userEvent.click(document.body);

    expect(red2).not.toHaveAttribute('data-selected');
    expect(screen.queryByRole('button', { name: '빨강 2 내기' })).not.toBeInTheDocument();
  });

  it('키보드 Enter는 포인터 종류와 상관없이 바로 낸다', () => {
    setMediaMatches((query) => query !== '(pointer: fine)');
    const { onPlay } = renderHand();

    fireEvent.keyDown(screen.getByRole('button', { name: '와일드, 낼 수 있어요' }), { key: 'Enter' });

    expect(onPlay).toHaveBeenCalledWith(wild(100));
  });

  it('키를 누르고 있어도 한 번만 낸다', () => {
    const { onPlay } = renderHand();

    fireEvent.keyDown(screen.getByRole('button', { name: '와일드, 낼 수 있어요' }), { key: 'Enter', repeat: true });

    expect(onPlay).not.toHaveBeenCalled();
  });

  it.each(['pc', 'portrait', 'landscape'] as const)('%s 배치에서도 한 줄이 아니라 부채꼴로 기울이고 호를 따라 가장자리를 내린다', (layout) => {
    render(<UnoHand cards={CARDS} playableIds={[]} myTurn={false} layout={layout} zoneId={1} onPlay={vi.fn()} />);

    const cards = screen.getAllByTestId('hand-card');
    const angles = cards.map((card) => Number(card.getAttribute('data-angle')));
    expect(angles).toEqual([-7.5, -2.5, 2.5, 7.5]);
    const drops = cards.map((card) => Number(/translateY\((-?[\d.]+)px\)/.exec(card.style.transform)?.[1] ?? 0));
    expect(drops[0]).toBeGreaterThan(drops[1]);
    expect(drops[0]).toBeCloseTo(drops[3]);
    expect(cards[0].style.transform).toContain('rotate(-7.5deg)');
  });

  // 카드의 진짜 윗끝: top + translateY(호를 따라 내려앉음 - 들어 올림) - 기울어 올라간 모서리 - 빛(낼 수 있는 카드).
  const realTop = (card: HTMLElement, extraLift: number) => {
    const translate = Number(/translateY\((-?[\d.]+)px\)/.exec(card.style.transform)?.[1] ?? 0);
    const angle = Number(card.getAttribute('data-angle'));
    const glow = card.getAttribute('data-lifted') === 'true' ? HAND_GLOW : 0;
    return parseFloat(card.style.top) + translate - extraLift - fanUnderhang(parseFloat(card.style.width), angle) - glow;
  };
  const MANY: UnoCard[] = [...CARDS, num('GREEN', 1, 51), num('GREEN', 2, 52), num('YELLOW', 3, 27), drawTwo('BLUE', 98)];

  it.each([['pc', 24], ['portrait', 24], ['landscape', 16]] as const)('터치 %s: 고른 카드까지 들어 올려도 기운 모서리와 빛이 줄 위로 넘치지 않는다', async (layout, selectLift) => {
    setMediaMatches((query) => query !== '(pointer: fine)');
    render(<UnoHand cards={MANY} playableIds={MANY.map((card) => card.id)} myTurn layout={layout} zoneId={1} onPlay={vi.fn()} />);
    const cards = screen.getAllByTestId('hand-card');
    await userEvent.click(cards[3]);

    screen.getAllByTestId('hand-card').forEach((card) => {
      // 고른 카드는 이미 들어 올려져 있고, 나머지는 골랐을 때를 가정해 더 올린다.
      const extra = card.getAttribute('data-selected') === 'true' ? 0 : selectLift;
      expect(realTop(card, extra)).toBeGreaterThanOrEqual(0);
    });
  });

  it('정밀 포인터(PC)는 고르기 들어 올림이 없으니 낼 수 있는 카드의 빛까지만 위 여백을 둔다', () => {
    setMediaMatches(true);
    render(<UnoHand cards={MANY} playableIds={MANY.map((card) => card.id)} myTurn layout="pc" zoneId={1} onPlay={vi.fn()} />);

    const cards = screen.getAllByTestId('hand-card');
    cards.forEach((card) => expect(realTop(card, 0)).toBeGreaterThanOrEqual(0));
    expect(Math.min(...cards.map((card) => realTop(card, 0)))).toBeLessThan(2);
  });

  it('첫 카드와 마지막 카드가 줄 양끝 여백 안에 들어 잘리지 않는다', () => {
    setMediaMatches(true);
    renderHand();

    const inner = screen.getByTestId('uno-hand').firstElementChild as HTMLElement;
    const cards = screen.getAllByTestId('hand-card');
    const { step, inset } = handSpacing(4, 0, UNO_SIZES.pc, 7.5);
    expect(inset).toBeGreaterThanOrEqual(fanOverhang(88, 7.5));
    expect(parseFloat(cards[0].style.left)).toBe(inset);
    expect(parseFloat(cards[3].style.left)).toBe(inset + step * 3);
    expect(parseFloat(inner.style.width)).toBe(inset * 2 + step * 3 + 88);
  });

  it('높이가 낮은 PC 화면에서는 작은 카드를 쓴다', () => {
    setMediaMatches((query) => query !== PC_TALL_QUERY);
    renderHand();

    expect(screen.getAllByTestId('hand-card')[0].style.width).toBe(`${UNO_PC_SHORT_SIZES.hand}px`);
  });

  it('방금 받은 카드는 1.2초 동안 표시한다', () => {
    vi.useFakeTimers();
    const { rerender } = renderHand();
    screen.getAllByTestId('hand-card').forEach((card) => expect(card).not.toHaveAttribute('data-fresh'));

    rerender(<UnoHand cards={[...CARDS, drawTwo('GREEN', 73)]} playableIds={[]} myTurn={false} layout="pc" zoneId={1} onPlay={vi.fn()} />);
    expect(screen.getByRole('button', { name: '초록 +2' })).toHaveAttribute('data-fresh', 'true');

    act(() => { vi.advanceTimersByTime(1200); });
    expect(screen.getByRole('button', { name: '초록 +2' })).not.toHaveAttribute('data-fresh');
  });
});
