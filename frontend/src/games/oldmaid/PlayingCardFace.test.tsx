import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { JOKER_CARD, playingCard } from './cards';

/** 모서리 표시가 차지하는 띠(카드 그림 폭 200 기준). 가운데 그림은 이 오른쪽에만 있어야 한다(F-c8). */
const CORNER_BAND = 58;

/**
 * 카드 좌표 그대로 그린 요소들의 왼쪽 끝 x(rect는 x, circle은 cx − r, path는 M·L·Q 좌표에서 각각 테두리 반을 뺀다).
 * transform으로 옮겨 그린 무늬(SuitGlyph)는 PIPS 쪽 검사에서 따로 본다.
 */
function leftEdges(root: Element): number[] {
  const plain = Array.from(root.querySelectorAll('rect, circle, path')).filter((node) => !node.closest('[transform]'));
  return plain.map((node) => {
    const half = Number(node.getAttribute('stroke-width') ?? 0) / 2;
    if (node.tagName === 'rect') {
      return Number(node.getAttribute('x')) - half;
    }
    if (node.tagName === 'circle') {
      return Number(node.getAttribute('cx')) - Number(node.getAttribute('r')) - half;
    }
    const xs = (node.getAttribute('d') ?? '').match(/[MLQ][^MLQZ]*/g) ?? [];
    return Math.min(...xs.flatMap((part) => part.slice(1).trim().split(/[\s,]+/).filter((_, i) => i % 2 === 0).map(Number))) - half;
  });
}
import { ACE_PIP_SIZE, PIP_SIZE, PIPS, PlayingCardFace, SUIT_HALF_WIDTH } from './PlayingCardFace';

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

  it('F-c8 가운데 그림은 겹친 손패에서 보이는 모서리 띠(x 58) 안으로 들어오지 않는다', () => {
    const pipColumns = Object.values(PIPS).flat().map(([x]) => x);
    expect(Math.min(...pipColumns) - SUIT_HALF_WIDTH * PIP_SIZE).toBeGreaterThan(CORNER_BAND);
    expect(100 - SUIT_HALF_WIDTH * ACE_PIP_SIZE).toBeGreaterThan(CORNER_BAND);

    const king = render(<PlayingCardFace card={playingCard('CLUBS', 'KING')} width={60} />);
    const frame = king.container.querySelector('[data-testid="face-frame"]') as Element;
    const joker = render(<PlayingCardFace card={JOKER_CARD} width={60} />);
    const art = joker.container.querySelector('[data-testid="joker-art"]') as Element;
    expect(Math.min(...leftEdges(frame))).toBeGreaterThan(CORNER_BAND);
    expect(Math.min(...leftEdges(art))).toBeGreaterThan(CORNER_BAND);
  });
});
