import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { JOKER_CARD, playingCard } from './cards';

/** 모서리 표시가 차지하는 띠(카드 그림 폭 200 기준). 가운데 그림은 이 오른쪽에만 있어야 한다(F-c8). */
const CORNER_BAND = 58;

/**
 * 카드 좌표 그대로 그린 요소들의 가로 범위 [왼쪽 끝, 오른쪽 끝](rect는 x~x+width, circle은 cx ± r, path는 M·L·Q 좌표에서 각각 테두리 반을 더하고 뺀다).
 * transform으로 옮겨 그린 무늬(SuitGlyph)는 PIPS 쪽 검사에서 따로 본다.
 */
function extents(root: Element): [number, number][] {
  const plain = Array.from(root.querySelectorAll('rect, circle, path')).filter((node) => !node.closest('[transform]'));
  return plain.map((node) => {
    const half = Number(node.getAttribute('stroke-width') ?? 0) / 2;
    if (node.tagName === 'rect') {
      const x = Number(node.getAttribute('x'));
      return [x - half, x + Number(node.getAttribute('width')) + half];
    }
    if (node.tagName === 'circle') {
      const cx = Number(node.getAttribute('cx'));
      const r = Number(node.getAttribute('r'));
      return [cx - r - half, cx + r + half];
    }
    const parts = (node.getAttribute('d') ?? '').match(/[MLQ][^MLQZ]*/g) ?? [];
    const xs = parts.flatMap((part) => part.slice(1).trim().split(/[\s,]+/).filter((_, i) => i % 2 === 0).map(Number));
    return [Math.min(...xs) - half, Math.max(...xs) + half];
  });
}

function leftEdges(root: Element): number[] {
  return extents(root).map(([left]) => left);
}

function rightEdges(root: Element): number[] {
  return extents(root).map(([, right]) => right);
}
import { ACE_PIP_SIZE, JOKER_LETTER_SIZE, PIP_SIZE, PIPS, PlayingCardFace, SUIT_HALF_WIDTH } from './PlayingCardFace';

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

  it('숫자 카드는 가운데 무늬가 정확히 숫자만큼이고 모서리에는 무늬가 없으며 랭크 글자만 무늬 색이다', () => {
    ([['HEARTS', 'SEVEN', 7, '#C8283C'], ['SPADES', 'NINE', 9, '#1F2430'], ['CLUBS', 'ACE', 1, '#1F2430'], ['DIAMONDS', 'KING', 0, '#C8283C']] as const).forEach(([suit, rank, count, color]) => {
      const { container } = render(<PlayingCardFace card={playingCard(suit, rank)} width={60} />);
      expect(container.querySelectorAll('[data-testid="pip"]')).toHaveLength(count);
      const corners = Array.from(container.querySelectorAll('[data-testid="corner-index"]'));
      expect(corners).toHaveLength(2);
      corners.forEach((corner) => {
        expect(corner.querySelectorAll('[data-suit]')).toHaveLength(0);
        expect(corner.querySelectorAll('path, circle')).toHaveLength(0);
        expect(corner.querySelector('text')?.getAttribute('fill')).toBe(color);
      });
    });
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

  it('숫자 카드 무늬는 표준 배치: 위 줄·아래 줄이 같고, 7 말고는 위아래 대칭이고, 열은 가운데를 두고 좌우 대칭이다', () => {
    Object.entries(PIPS).forEach(([count, pips]) => {
      expect(pips).toHaveLength(Number(count));
      const ys = pips.map(([, y]) => y);
      expect(Math.min(...ys)).toBe(60);
      expect(Math.max(...ys)).toBe(240);
      pips.forEach(([x]) => expect([76, 100, 124]).toContain(x));
      pips.forEach(([x, y]) => expect(pips).toContainEqual([200 - x, y]));
      if (count !== '7') {
        pips.forEach(([x, y]) => expect(pips).toContainEqual([x, 300 - y]));
      }
    });
    expect(PIPS[2].every(([x]) => x === 100)).toBe(true);
    expect(PIPS[3].map(([, y]) => y)).toEqual([60, 150, 240]);
    // 4줄짜리(9·10)는 위에서 아래까지 같은 간격.
    const nineSides = PIPS[9].filter(([x]) => x === 76).map(([, y]) => y);
    expect(nineSides).toEqual([60, 120, 180, 240]);
    expect(PIPS[10].filter(([x]) => x === 100).map(([, y]) => y)).toEqual([90, 210]);
  });

  it('가운데보다 아래쪽 무늬는 180도 돌려 그린다', () => {
    const { container } = render(<PlayingCardFace card={playingCard('SPADES', 'EIGHT')} width={60} />);

    const transforms = Array.from(container.querySelectorAll('[data-testid="pip"]')).map((pip) => pip.getAttribute('transform') ?? '');
    const flipped = transforms.filter((transform) => transform.includes('rotate(180)'));
    expect(flipped).toHaveLength(3);
    flipped.forEach((transform) => expect(Number(/translate\(\d+ (\d+)\)/.exec(transform)?.[1])).toBeGreaterThan(150));
  });

  it('F-c8 가운데 그림은 겹친 손패에서 보이는 모서리 띠(x 58) 안으로 들어오지 않는다', () => {
    const pipColumns = Object.values(PIPS).flat().map(([x]) => x);
    expect(Math.min(...pipColumns) - SUIT_HALF_WIDTH * PIP_SIZE).toBeGreaterThan(CORNER_BAND);
    expect(Math.max(...pipColumns) + SUIT_HALF_WIDTH * PIP_SIZE).toBeLessThan(200 - CORNER_BAND);
    expect(100 - SUIT_HALF_WIDTH * ACE_PIP_SIZE).toBeGreaterThan(CORNER_BAND);

    const king = render(<PlayingCardFace card={playingCard('CLUBS', 'KING')} width={60} />);
    const frame = king.container.querySelector('[data-testid="face-frame"]') as Element;
    const joker = render(<PlayingCardFace card={JOKER_CARD} width={60} />);
    const art = joker.container.querySelector('[data-testid="joker-art"]') as Element;
    expect(Math.min(...leftEdges(frame))).toBeGreaterThan(CORNER_BAND);
    expect(Math.min(...leftEdges(art))).toBeGreaterThan(CORNER_BAND);
    expect(Math.max(...rightEdges(art))).toBeLessThan(200 - CORNER_BAND);
  });

  it('조커는 가운데에 광대 전신 그림을 두고 모서리에 JOKER를 위에서 아래로 한 글자씩 크게 세로로 쓴다', () => {
    const { container } = render(<PlayingCardFace card={JOKER_CARD} width={60} />);

    const art = container.querySelector('[data-testid="joker-art"]') as Element;
    expect(art.querySelectorAll('[data-part="hat"]')).toHaveLength(3);
    const corner = container.querySelector('[data-testid="corner-index"]') as Element;
    expect(corner).toHaveAttribute('data-corner', 'JOKER');
    const letters = Array.from(corner.querySelectorAll('[data-testid="joker-letter"]'));
    expect(letters.map((letter) => letter.textContent).join('')).toBe('JOKER');
    const ys = letters.map((letter) => Number(letter.getAttribute('y')));
    expect(ys).toEqual([...ys].sort((a, b) => a - b));
    letters.forEach((letter) => {
      expect(letter).toHaveAttribute('font-weight', '900');
      expect(Number(letter.getAttribute('x')) + JOKER_LETTER_SIZE / 2).toBeLessThanOrEqual(CORNER_BAND);
    });
    expect(container.textContent).not.toContain('조');
  });
});
