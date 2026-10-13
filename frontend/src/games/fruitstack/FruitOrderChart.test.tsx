import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FruitOrderChart } from './FruitOrderChart';

const button = () => screen.getByRole('button', { name: '과일 순서 보기' });
const chart = () => screen.queryByRole('dialog', { name: '과일 순서' });
const open = async () => {
  await userEvent.click(button());
  return screen.getByRole('dialog', { name: '과일 순서' });
};

describe('FruitOrderChart', () => {
  it('처음에는 닫혀 있고, 버튼을 누르면 체리부터 수박까지 11가지를 순서대로 보인다', async () => {
    render(<FruitOrderChart />);

    expect(chart()).toBeNull();
    expect(button()).toHaveAttribute('aria-expanded', 'false');
    expect(button()).toHaveTextContent('순서');

    const dialog = await open();
    expect(button()).toHaveAttribute('aria-expanded', 'true');
    const list = within(dialog).getByRole('list', { name: '작은 과일부터 큰 과일까지' });
    expect(within(list).getAllByRole('listitem').map((item) => item.textContent))
      .toEqual(['체리', '딸기', '포도', '귤', '감', '사과', '배', '복숭아', '파인애플', '멜론', '수박']);
    expect(dialog).toHaveTextContent('같은 과일 둘이 닿으면 다음 과일로 합쳐져요.');
    expect(dialog).toHaveTextContent('수박 둘이 닿으면 함께 사라져요.');
  });

  it('과일 그림은 뒤로 갈수록 커지고, 마지막(수박) 뒤에는 화살표가 없다', async () => {
    render(<FruitOrderChart />);
    const items = within(await open()).getAllByTestId('chart-fruit');
    const sizes = items.map((item) => Number(item.querySelector('svg')?.getAttribute('width')));

    expect(sizes[0]).toBe(20);
    expect(sizes[10]).toBe(44);
    expect(sizes.every((size, index) => index === 0 || size > sizes[index - 1])).toBe(true);
    expect(items.map((item) => item.querySelectorAll('svg').length)).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1]);
  });

  it('화면을 막는 창이 아니다(바탕을 깔지 않아 뒤 화면을 그대로 누를 수 있다)', async () => {
    render(<FruitOrderChart />);
    const dialog = await open();

    expect(dialog).not.toHaveAttribute('aria-modal');
    expect(screen.queryByTestId('modal-backdrop')).toBeNull();
    expect(dialog.parentElement).toBe(document.body);
    expect(dialog).toHaveClass('fixed');
    expect(dialog).not.toHaveClass('inset-0');
  });

  it('닫기 버튼, Esc, 버튼 다시 누르기로 닫힌다', async () => {
    render(<FruitOrderChart />);

    await userEvent.click(within(await open()).getByRole('button', { name: '닫기' }));
    await waitFor(() => expect(chart()).toBeNull());

    await open();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(chart()).toBeNull());

    await open();
    await userEvent.click(button());
    await waitFor(() => expect(chart()).toBeNull());
  });

  it('밖을 누르는 순간 닫히고, 순서표 안을 누르면 그대로다', async () => {
    render(<><FruitOrderChart /><div data-testid="board" /></>);
    const dialog = await open();

    fireEvent.pointerDown(within(dialog).getByText('수박'));
    expect(chart()).not.toBeNull();

    fireEvent.pointerDown(screen.getByTestId('board'));
    await waitFor(() => expect(chart()).toBeNull());
  });

  it('테이블이 잠기면(게임 끝 연출) 열려 있던 순서표를 닫는다', async () => {
    const { rerender } = render(<FruitOrderChart />);
    await open();

    rerender(<FruitOrderChart locked />);
    await waitFor(() => expect(chart()).toBeNull());
  });
});
