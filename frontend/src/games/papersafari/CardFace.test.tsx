import { render, screen } from '@testing-library/react';
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

  it('엿본 카드는 엿봄 표시를 한다', () => {
    render(<CardFace card={{ kind: 'FOX', value: -2 }} faceUp={false} known />);

    const card = screen.getByLabelText('여우 -2 카드 (엿봄)');
    expect(card).toHaveTextContent('👁');
    expect(card).toHaveAttribute('data-side', 'back');
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
