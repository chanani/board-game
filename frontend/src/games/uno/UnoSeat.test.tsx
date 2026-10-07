import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UnoSeat } from './UnoSeat';

const player = { playerId: 2, cardCount: 1, unoDeclared: true };

describe('UnoSeat', () => {
  it('우노! 말풍선은 좁은 자리에서도 줄바꿈되지 않고 글자 폭 그대로 앞으로 떠 있다', () => {
    render(<UnoSeat player={player} nickname="아주긴이름의플레이어" active={false} backWidth={22} maxBacks={4} catchable={false} bubble />);

    const bubble = screen.getByTestId('uno-bubble');
    expect(bubble).toHaveTextContent('우노!');
    expect(bubble).toHaveClass('whitespace-nowrap', 'w-max', 'z-20');
    expect(screen.getByTestId('uno-badge')).toHaveClass('whitespace-nowrap');
  });
});
