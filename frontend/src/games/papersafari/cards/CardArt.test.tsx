import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CardView } from '../../../api/types';
import { CardArt } from './CardArt';

const NUMBER_KEYS = ['mouse', 'rabbit', 'monkey', 'zebra', 'giraffe', 'cheetah', 'hippo', 'crocodile', 'rhino', 'lion'];

describe('CardArt', () => {
  it.each(NUMBER_KEYS.map((key, value) => [value, key] as const))('숫자 %i은 %s 그림이다', (value, key) => {
    const { container } = render(<CardArt card={{ kind: 'NUMBER', value }} />);

    expect(container.querySelector(`[data-art="${key}"]`)).not.toBeNull();
    expect(container).toHaveTextContent(String(value));
  });

  it.each([
    [{ kind: 'ELEPHANT', value: 10 }, 'elephant', '코끼리'],
    [{ kind: 'TARZAN', value: 10 }, 'tarzan', '타잔'],
    [{ kind: 'FOX', value: -2 }, 'fox', '여우'],
    [{ kind: 'WILD', value: 0 }, 'wild', '와일드'],
  ] as [CardView, string, string][])('특수 카드 %o는 %s 그림과 이름을 그린다', (card, key, name) => {
    const { container } = render(<CardArt card={card} />);

    expect(container.querySelector(`[data-art="${key}"]`)).not.toBeNull();
    expect(container).toHaveTextContent(name);
  });

  it('와일드는 숫자 대신 ?를 그린다', () => {
    const { container } = render(<CardArt card={{ kind: 'WILD', value: 0 }} />);

    expect(container).toHaveTextContent('?');
  });
});
