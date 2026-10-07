import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UnoBoxArt } from './UnoBoxArt';

describe('UnoBoxArt', () => {
  it('바탕은 모서리까지 꽉 채워 상자 옆면·그림자가 모서리로 새지 않는다', () => {
    render(<UnoBoxArt />);

    const bg = screen.getByTestId('uno-box-bg');
    expect(bg).not.toHaveAttribute('rx');
    expect(bg).toHaveAttribute('width', '120');
    expect(bg).toHaveAttribute('height', '150');
    expect(screen.getByTestId('uno-box-art')).toHaveAttribute('preserveAspectRatio', 'xMidYMid slice');
  });
});
