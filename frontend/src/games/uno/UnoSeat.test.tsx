import { render, screen, within } from '@testing-library/react';
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

  it('이름표 앞에 프로필 그림을 두고, 이름표 높이를 늘리지 않게 위아래를 살짝 넘친다', () => {
    render(<UnoSeat player={player} nickname="밥" avatar="FROG" active={false} backWidth={22} maxBacks={4} catchable={false} />);

    const tag = screen.getByTestId('seat-tag');
    const face = within(tag).getByTestId('avatar');
    expect(face).toHaveAttribute('data-avatar', 'FROG');
    expect(face).toHaveAttribute('height', '18');
    expect(face).toHaveClass('-my-0.5');
    expect(tag).toHaveTextContent('밥');
  });
});
