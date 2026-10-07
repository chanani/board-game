import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UnoCardFace } from './UnoCardFace';
import { drawTwo, num, reverse, skip, wild, wildFour } from './unoFixtures';

describe('UnoCardFace', () => {
  it('숫자 카드는 색 이름과 숫자로 읽히고 2:3 크기다', () => {
    render(<UnoCardFace card={num('BLUE', 7, 88)} width={60} />);

    const card = screen.getByRole('img', { name: '파랑 7' });
    expect(card).toHaveAttribute('data-kind', 'NUMBER');
    expect(card).toHaveAttribute('data-color', 'BLUE');
    expect(card).toHaveAttribute('width', '60');
    expect(card).toHaveAttribute('height', '90');
  });

  it('기능 카드와 와일드를 이름으로 읽는다', () => {
    render(
      <>
        <UnoCardFace card={skip('RED', 19)} width={60} />
        <UnoCardFace card={reverse('GREEN', 71)} width={60} />
        <UnoCardFace card={drawTwo('YELLOW', 48)} width={60} />
        <UnoCardFace card={wild(100)} width={60} />
        <UnoCardFace card={wildFour(104)} width={60} />
      </>,
    );

    expect(screen.getByRole('img', { name: '빨강 건너뛰기' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '초록 방향 바꾸기' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '노랑 +2' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '와일드' }).querySelector('[data-testid="wild-wheel"]')).not.toBeNull();
    expect(screen.getByRole('img', { name: '와일드 +4' })).toHaveTextContent('+4');
  });

  it('6과 9에만 밑줄을 긋는다', () => {
    render(
      <>
        <UnoCardFace card={num('RED', 6, 11)} width={60} />
        <UnoCardFace card={num('RED', 9, 17)} width={60} />
        <UnoCardFace card={num('RED', 8, 15)} width={60} />
      </>,
    );

    expect(screen.getByRole('img', { name: '빨강 6' }).querySelector('[data-testid="underline"]')).not.toBeNull();
    expect(screen.getByRole('img', { name: '빨강 9' }).querySelector('[data-testid="underline"]')).not.toBeNull();
    expect(screen.getByRole('img', { name: '빨강 8' }).querySelector('[data-testid="underline"]')).toBeNull();
  });

  it('색맹 보조 모양을 색마다 다르게 그린다', () => {
    render(
      <>
        <UnoCardFace card={num('RED', 1, 1)} width={60} />
        <UnoCardFace card={num('YELLOW', 1, 26)} width={60} />
        <UnoCardFace card={num('GREEN', 1, 51)} width={60} />
        <UnoCardFace card={num('BLUE', 1, 76)} width={60} />
        <UnoCardFace card={wild(100)} width={60} />
      </>,
    );

    const shapes = screen.getAllByTestId('color-mark').map((mark) => mark.getAttribute('data-shape'));
    expect(shapes).toEqual(['circle', 'triangle', 'square', 'diamond']);
  });

  it('뒷면은 우노 글자를 쓰고 장식이면 스크린 리더에서 숨긴다', () => {
    const { rerender, container } = render(<UnoCardFace card={null} width={36} />);

    expect(screen.getByRole('img', { name: '우노 카드 뒷면' })).toHaveTextContent('우노');
    rerender(<UnoCardFace card={null} width={36} decorative />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('겹쳐도 알아보게 왼쪽 위·오른쪽 아래 모서리에 크고 굵은 숫자·기호를 둔다', () => {
    render(
      <>
        <UnoCardFace card={num('YELLOW', 7, 1)} width={60} />
        <UnoCardFace card={skip('RED', 19)} width={60} />
        <UnoCardFace card={reverse('GREEN', 71)} width={60} />
        <UnoCardFace card={drawTwo('BLUE', 48)} width={60} />
        <UnoCardFace card={wild(100)} width={60} />
        <UnoCardFace card={wildFour(104)} width={60} />
      </>,
    );

    const corners = screen.getAllByTestId('corner-index').map((corner) => corner.getAttribute('data-corner'));
    expect(corners).toEqual(['7', '7', 'skip', 'skip', 'reverse', 'reverse', '+2', '+2', 'wild', 'wild', '+4', '+4']);
    const seven = screen.getByRole('img', { name: '노랑 7' }).querySelector('[data-testid="corner-index"] text');
    expect(Number(seven?.getAttribute('font-size'))).toBeGreaterThanOrEqual(60);
    expect(seven).toHaveAttribute('font-weight', '900');
  });

  it('뒷면은 비스듬한 빨강 타원 위에 윤곽선 두른 굵은 우노 글자를 기울여 쓰고 잔무늬는 두지 않는다', () => {
    render(<UnoCardFace card={null} width={22} />);

    const back = screen.getByTestId('uno-card-back');
    expect(back.querySelector('[data-testid="back-oval"]')?.parentElement).toHaveAttribute('transform', expect.stringMatching(/^rotate\(-60 /));
    const word = back.querySelector('[data-testid="back-word"]');
    expect(word).toHaveTextContent('우노');
    expect(word).toHaveAttribute('font-weight', '900');
    expect(word).toHaveAttribute('paint-order', 'stroke');
    expect(word?.getAttribute('transform')).toMatch(/rotate\(-22 100 150\) skewX/);
    expect(back.querySelectorAll('circle')).toHaveLength(0);
  });
});
