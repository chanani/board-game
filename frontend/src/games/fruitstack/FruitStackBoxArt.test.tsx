import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FruitStackBoxArt } from './FruitStackBoxArt';

describe('FruitStackBoxArt', () => {
  it('과일 다섯 개가 쌓인 그림과 이름을 그린다', () => {
    render(<FruitStackBoxArt />);
    const art = screen.getByTestId('fruit-box-art');

    expect(art.querySelectorAll('svg').length).toBeGreaterThanOrEqual(5);
    expect(art).toHaveTextContent('과일 쌓기');
    expect(art).toHaveAttribute('aria-hidden', 'true');
  });
});
