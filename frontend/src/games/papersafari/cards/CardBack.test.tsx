import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CardBack } from './CardBack';

describe('CardBack 테마', () => {
  it('무늬 두 색·테두리·문장 색과 무늬 각도를 방 테마 변수에서 읽는다(기본은 원목 초록 무늬)', () => {
    const { container } = render(<CardBack />);
    const styles = Array.from(container.querySelectorAll<SVGElement>('[style]')).map((node) => node.getAttribute('style') ?? '');
    const all = styles.join(' ');

    expect(all).toContain('var(--back-a, #1f6f45)');
    expect(all).toContain('var(--back-b, #25804f)');
    expect(all).toContain('var(--back-frame, #fffaf0)');
    expect(all).toContain('var(--seal-fill, #fffaf0)');
    expect(all).toContain('var(--seal-ring, #f2b33d)');
    expect(all).toContain('var(--back-angle, 45deg)');
  });
});
