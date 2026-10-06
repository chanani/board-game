import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UnoCard } from '../../api/types';
import { setMediaMatches } from '../../test/media';
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

  it('PC에서는 부채꼴로 기울이고 휴대폰에서는 한 줄로 둔다', () => {
    const { rerender } = renderHand();
    expect(screen.getAllByTestId('hand-card')[0]).toHaveAttribute('data-angle', '-6');

    rerender(<UnoHand cards={CARDS} playableIds={[3]} myTurn layout="portrait" zoneId={1} onPlay={vi.fn()} />);
    expect(screen.getAllByTestId('hand-card')[0]).toHaveAttribute('data-angle', '0');
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
