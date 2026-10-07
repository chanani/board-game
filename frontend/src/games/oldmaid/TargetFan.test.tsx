import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setMediaMatches } from '../../test/media';
import { TargetFan } from './TargetFan';

function fan(props: Partial<Parameters<typeof TargetFan>[0]> = {}) {
  return <TargetFan ownerName="밥" count={4} cardWidth={76} minVisible={30} liftIndex={null} layout="pc" interactive onPeek={vi.fn()} onDraw={vi.fn()} {...props} />;
}

beforeEach(() => setMediaMatches(true));

describe('TargetFan', () => {
  it('정밀 포인터: 올리면 신호, 누르면 뽑기, 부채 밖으로 나가면 고르지 않음', async () => {
    const onPeek = vi.fn();
    const onDraw = vi.fn();
    render(fan({ onPeek, onDraw }));
    const third = screen.getByRole('button', { name: '밥님의 3번째 카드' });

    await userEvent.hover(third);
    expect(onPeek).toHaveBeenLastCalledWith(2);
    expect(third).toHaveAttribute('aria-current', 'true');
    await userEvent.click(third);
    expect(onDraw).toHaveBeenCalledWith(2);
    await userEvent.unhover(screen.getByTestId('target-fan'));
    expect(onPeek).toHaveBeenLastCalledWith(null);
  });

  it('터치: 첫 탭은 고르고 "뽑기"가 뜨며, 같은 카드를 다시 누르거나 "뽑기"를 누르면 뽑는다', async () => {
    setMediaMatches((query) => query !== '(pointer: fine)');
    const onPeek = vi.fn();
    const onDraw = vi.fn();
    render(fan({ onPeek, onDraw }));

    await userEvent.click(screen.getByRole('button', { name: '밥님의 2번째 카드' }));
    expect(onDraw).not.toHaveBeenCalled();
    expect(onPeek).toHaveBeenLastCalledWith(1);
    // 뽑기는 자기 소리(draw)가 있으므로 공통 클릭 소리를 끈다(스펙 6.5).
    expect(screen.getByRole('button', { name: '밥님의 2번째 카드' })).toHaveAttribute('data-no-click-sound');
    expect(screen.getByRole('button', { name: '밥님의 2번째 카드 뽑기' })).toHaveAttribute('data-no-click-sound');
    await userEvent.click(screen.getByRole('button', { name: '밥님의 2번째 카드 뽑기' }));
    expect(onDraw).toHaveBeenCalledWith(1);

    await userEvent.click(screen.getByRole('button', { name: '밥님의 4번째 카드' }));
    await userEvent.click(screen.getByRole('button', { name: '밥님의 4번째 카드' }));
    expect(onDraw).toHaveBeenLastCalledWith(3);
  });

  it('터치로 고른 뒤 부채 밖을 누르면 고르기를 취소한다', async () => {
    setMediaMatches((query) => query !== '(pointer: fine)');
    const onPeek = vi.fn();
    render(<><button type="button">밖</button>{fan({ onPeek })}</>);

    await userEvent.click(screen.getByRole('button', { name: '밥님의 1번째 카드' }));
    await userEvent.click(screen.getByRole('button', { name: '밖' }));

    expect(onPeek).toHaveBeenLastCalledWith(null);
    expect(screen.queryByRole('button', { name: /뽑기$/ })).not.toBeInTheDocument();
  });

  it('키보드: 초점이 가면 신호, Enter로 뽑기', async () => {
    const onPeek = vi.fn();
    const onDraw = vi.fn();
    render(fan({ onPeek, onDraw }));

    await userEvent.tab();
    expect(onPeek).toHaveBeenLastCalledWith(0);
    await userEvent.keyboard('{Enter}');
    expect(onDraw).toHaveBeenCalledWith(0);
  });

  it('뽑는 사람이 아니면 누를 수 없고 받은 신호 자리만 들린다', () => {
    render(fan({ interactive: false, liftIndex: 2 }));

    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getAllByTestId('target-card')[2]).toHaveAttribute('data-lifted', 'true');
  });
});
