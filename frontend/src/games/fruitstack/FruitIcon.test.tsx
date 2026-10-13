import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FruitIcon } from './FruitIcon';

describe('FruitIcon', () => {
  it('그림 자료를 인라인 SVG로 그린다', () => {
    const { container } = render(<FruitIcon level={11} size={28} title="수박" />);
    const svg = container.querySelector('svg');

    expect(svg).toHaveAttribute('viewBox', '-50 -50 100 100');
    expect(svg).toHaveAttribute('width', '28');
    expect(svg).toHaveAttribute('height', '28');
    expect(svg?.querySelector('title')?.textContent).toBe('수박');
    expect(svg).not.toHaveAttribute('aria-hidden');
    expect(svg?.querySelectorAll('circle').length).toBeGreaterThanOrEqual(3);
    expect(svg?.querySelectorAll('path').length).toBeGreaterThanOrEqual(6);
  });

  it('이름이 없으면 장식이다', () => {
    const { container } = render(<FruitIcon level={1} size={20} />);

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('title')).toBeNull();
  });

  it('없는 단계는 아무것도 그리지 않는다', () => {
    expect(render(<FruitIcon level={0} size={20} />).container.firstChild).toBeNull();
    expect(render(<FruitIcon level={12} size={20} />).container.firstChild).toBeNull();
  });
});
