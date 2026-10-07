import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { JOKER_CARD, playingCard } from './cards';
import { PlayingCardFace } from './PlayingCardFace';

describe('PlayingCardFace', () => {
  it('앞면·조커·뒷면에 접근성 이름이 있고 장식이면 숨긴다', () => {
    render(
      <>
        <PlayingCardFace card={playingCard('HEARTS', 'TEN')} width={60} />
        <PlayingCardFace card={JOKER_CARD} width={60} />
        <PlayingCardFace card={null} width={60} />
        <PlayingCardFace card={playingCard('SPADES', 'ACE')} width={60} decorative />
      </>,
    );

    expect(screen.getByRole('img', { name: '하트 10' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '조커' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '카드 뒷면' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: '스페이드 A' })).not.toBeInTheDocument();
  });

  it('왼쪽 위와 오른쪽 아래(돌려서)에 큰 모서리 표시가 있다', () => {
    const { container } = render(<PlayingCardFace card={playingCard('DIAMONDS', 'TEN')} width={60} />);

    const corners = container.querySelectorAll('[data-testid="corner-index"]');
    expect(corners).toHaveLength(2);
    expect(corners[0].getAttribute('data-corner')).toBe('10');
  });

  it('숫자 카드는 숫자만큼 무늬를, A는 큰 무늬 하나를, 그림 카드는 틀을 그린다', () => {
    const seven = render(<PlayingCardFace card={playingCard('HEARTS', 'SEVEN')} width={60} />);
    expect(seven.container.querySelectorAll('[data-testid="pip"]')).toHaveLength(7);
    const ace = render(<PlayingCardFace card={playingCard('SPADES', 'ACE')} width={60} />);
    expect(ace.container.querySelectorAll('[data-testid="pip"]')).toHaveLength(1);
    const king = render(<PlayingCardFace card={playingCard('CLUBS', 'KING')} width={60} />);
    expect(king.container.querySelector('[data-testid="face-frame"]')).not.toBeNull();
    const joker = render(<PlayingCardFace card={JOKER_CARD} width={60} />);
    expect(joker.container.querySelector('[data-testid="joker-art"]')).not.toBeNull();
  });

  it('무늬는 글자가 아니라 SVG이고 색이 고정이다', () => {
    const { container } = render(
      <>
        <PlayingCardFace card={playingCard('HEARTS', 'TWO')} width={60} />
        <PlayingCardFace card={playingCard('SPADES', 'TWO')} width={60} />
      </>,
    );

    expect(container.textContent ?? '').not.toMatch(/[♠-♧]/);
    expect(container.querySelector('path[data-suit="HEARTS"]')?.getAttribute('fill')).toBe('#C8283C');
    expect(container.querySelector('path[data-suit="SPADES"]')?.getAttribute('fill')).toBe('#1F2430');
  });

  it('뒷면은 방 테마의 카드 뒷면 색을 쓴다', () => {
    const { container } = render(<PlayingCardFace card={null} width={60} />);

    expect(container.innerHTML).toContain('var(--card-back-from, #23305A)');
  });
});
