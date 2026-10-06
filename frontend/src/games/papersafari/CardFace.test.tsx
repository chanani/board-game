import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CardFace } from './CardFace';

describe('CardFace', () => {
  it('값이 없으면 뒷면으로 그린다', () => {
    render(<CardFace card={null} faceUp={false} known={false} />);

    expect(screen.getByLabelText('뒷면 카드')).toHaveAttribute('data-side', 'back');
  });

  it('숫자 카드는 동물 그림과 숫자를 보여준다', () => {
    render(<CardFace card={{ kind: 'NUMBER', value: 7 }} faceUp known={false} />);

    const card = screen.getByLabelText('7 카드');
    expect(card).toHaveAttribute('data-side', 'front');
    expect(card.querySelector('[data-art="crocodile"]')).not.toBeNull();
    expect(card).toHaveTextContent('7');
  });

  it('특수 카드는 이름을 보여준다', () => {
    render(<CardFace card={{ kind: 'TARZAN', value: 10 }} faceUp known={false} />);

    expect(screen.getByLabelText('타잔 10 카드')).toHaveTextContent('타잔');
  });

  it('엿본 카드는 앞면을 또렷하게 그리고 보라 점선 테두리와 "엿봄" 꼬리표를 단다', () => {
    render(<CardFace card={{ kind: 'FOX', value: -2 }} faceUp={false} known />);

    const card = screen.getByLabelText('여우 -2 카드 (엿봄)');
    expect(card).toHaveAttribute('data-side', 'peeked');
    expect(card).toHaveClass('outline-dashed', 'outline-violet-400', 'peek-lift');
    expect(card).not.toHaveClass('outline-none');
    expect(card.querySelector('.card-inner')).toHaveStyle({ transform: 'rotateY(0deg)' });
    expect(within(card).getByTestId('peek-tag')).toHaveTextContent('엿봄');
    expect(card.querySelector('[data-testid="peek-icon"]')).toBeNull();
    expect(card.querySelector('.opacity-45')).toBeNull();
    expect(card.textContent).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('공개된 카드에는 엿봄 표시가 없다', () => {
    render(<CardFace card={{ kind: 'FOX', value: -2 }} faceUp known />);

    const card = screen.getByLabelText('여우 -2 카드');
    expect(card).toHaveAttribute('data-side', 'front');
    expect(card).not.toHaveClass('outline-dashed');
    expect(card).toHaveClass('outline-none');
    expect(screen.queryByTestId('peek-tag')).not.toBeInTheDocument();
  });

  it('누를 수 없는 카드는 비활성이다', () => {
    render(<CardFace card={{ kind: 'NUMBER', value: 1 }} faceUp known={false} />);

    expect(screen.getByLabelText('1 카드')).toBeDisabled();
  });

  it('값을 모르는 카드는 그림을 DOM에 두지 않는다', () => {
    const { container } = render(<CardFace card={null} faceUp={false} known={false} />);

    expect(container.querySelector('[data-art]')).toBeNull();
  });
});
