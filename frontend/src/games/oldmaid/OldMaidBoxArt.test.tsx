import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OldMaidBoxArt } from './OldMaidBoxArt';

describe('OldMaidBoxArt', () => {
  it('바탕을 모서리까지 꽉 채우고 조커와 도둑 가면, 이름을 그린다', () => {
    render(<OldMaidBoxArt />);

    const bg = screen.getByTestId('old-maid-box-bg');
    expect(bg).not.toHaveAttribute('rx');
    expect(bg).toHaveAttribute('width', '120');
    expect(screen.getByTestId('old-maid-box-art')).toHaveAttribute('preserveAspectRatio', 'xMidYMid slice');
    expect(screen.getByTestId('old-maid-box-art').querySelector('[data-rank="JOKER"]')).not.toBeNull();
    expect(screen.getByTestId('box-mask')).toBeInTheDocument();
    expect(screen.getByText('도둑잡기')).toBeInTheDocument();
  });
});
