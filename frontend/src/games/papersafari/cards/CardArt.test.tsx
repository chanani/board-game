import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CardView } from '../../../api/types';
import { CardArt } from './CardArt';
import { CardBack } from './CardBack';

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

  it('여러 장을 그려도 무늬·그라데이션 id가 겹치지 않고 각자 자기 것을 가리킨다', () => {
    const { container } = render(
      <div>
        <CardBack /><CardBack />
        <CardArt card={{ kind: 'NUMBER', value: 9 }} /><CardArt card={{ kind: 'NUMBER', value: 9 }} />
      </div>,
    );

    const ids = [...container.querySelectorAll('pattern, linearGradient')].map((element) => element.id);
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(4);
    container.querySelectorAll('svg').forEach((svg) => {
      const own = svg.querySelector('pattern, linearGradient')?.id;
      const refs = [...svg.querySelectorAll('[fill]')].map((element) => element.getAttribute('fill'));
      expect(refs).toContain(`url(#${own})`);
    });
  });

  it('왼쪽 위 숫자 동그라미와 글자를 크게 그린다(한 자리 22, 두 자리 17)', () => {
    const { container, rerender } = render(<CardArt card={{ kind: 'NUMBER', value: 7 }} />);
    expect(container.querySelector('[data-part="value-badge"]')).toHaveAttribute('r', '17');
    expect(container.querySelector('[data-part="value"]')).toHaveAttribute('font-size', '22');
    rerender(<CardArt card={{ kind: 'NUMBER', value: 12 }} />);
    expect(container.querySelector('[data-part="value"]')).toHaveAttribute('font-size', '17');
  });
});
