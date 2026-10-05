import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CardFace } from './CardFace';

describe('CardFace', () => {
  it('값이 없으면 뒷면으로 그린다', () => {
    render(<CardFace card={null} faceUp={false} known={false} />);

    expect(screen.getByLabelText('뒷면 카드')).toBeInTheDocument();
  });

  it('숫자 카드는 이모지와 숫자를 보여준다', () => {
    render(<CardFace card={{ kind: 'NUMBER', value: 7 }} faceUp known={false} />);

    expect(screen.getByLabelText('7 카드')).toHaveTextContent('🐊');
    expect(screen.getByLabelText('7 카드')).toHaveTextContent('7');
  });

  it('특수 카드는 이름을 보여준다', () => {
    render(<CardFace card={{ kind: 'TARZAN', value: 10 }} faceUp known={false} />);

    expect(screen.getByLabelText('타잔 10 카드')).toHaveTextContent('타잔');
  });

  it('엿본 카드는 엿봄 표시를 한다', () => {
    render(<CardFace card={{ kind: 'FOX', value: -2 }} faceUp={false} known />);

    expect(screen.getByLabelText('여우 -2 카드 (엿봄)')).toHaveTextContent('👁');
  });
});
