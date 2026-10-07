import { useId } from 'react';
import type { PlayingCard, Suit } from '../../api/types';
import { cardName, inkOf, JOKER_GOLD, JOKER_PURPLE, RANK_LABELS } from './cards';

type Props = {
  /** null이면 뒷면. */
  card: PlayingCard | null;
  /** 카드 폭(px). 높이는 1.5배. */
  width: number;
  /** 부채의 뒷면처럼 장식이면 스크린 리더에서 숨긴다. */
  decorative?: boolean;
  className?: string;
};

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
// 무늬 path는 100×100 상자 기준(가운데 50,50). 클로버는 원 셋 + 줄기라 따로 그린다.
const SUIT_PATHS: Record<Exclude<Suit, 'CLUBS'>, string> = {
  HEARTS: 'M50 92 C22 70 4 52 4 32 C4 15 16 5 30 5 C40 5 47 11 50 19 C53 11 60 5 70 5 C84 5 96 15 96 32 C96 52 78 70 50 92 Z',
  DIAMONDS: 'M50 3 L88 50 L50 97 L12 50 Z',
  SPADES: 'M50 4 C62 22 96 40 96 62 C96 76 85 86 72 86 C63 86 57 82 53 76 C54 84 58 92 66 97 L34 97 C42 92 46 84 47 76 C43 82 37 86 28 86 C15 86 4 76 4 62 C4 40 38 22 50 4 Z',
};
const STAR = 'M50 4 L62 38 L98 38 L69 59 L80 94 L50 73 L20 94 L31 59 L2 38 L38 38 Z';

type GlyphProps = { suit: Suit; x: number; y: number; size: number; fill: string; flip?: boolean; testId?: string };

/** 무늬 하나를 (x, y) 가운데에 size 크기로. flip이면 180도 돌린다(아래쪽 무늬·오른쪽 아래 모서리). */
export function SuitGlyph({ suit, x, y, size, fill, flip = false, testId }: GlyphProps) {
  const transform = `translate(${x} ${y}) rotate(${flip ? 180 : 0}) scale(${size / 100}) translate(-50 -50)`;
  if (suit === 'CLUBS') {
    return (
      <g data-testid={testId} data-suit="CLUBS" transform={transform} fill={fill}>
        <circle cx="50" cy="28" r="21" /><circle cx="27" cy="58" r="21" /><circle cx="73" cy="58" r="21" />
        <path d="M45 56 C45 76 41 88 32 97 L68 97 C59 88 55 76 55 56 Z" />
      </g>
    );
  }
  return <path data-testid={testId} data-suit={suit} transform={transform} fill={fill} d={SUIT_PATHS[suit]} />;
}

// 숫자 카드 무늬 배치(카드 그림 200×300). 가운데보다 아래에 있는 무늬는 돌려서 그린다.
// 왼쪽 줄 무늬의 왼쪽 끝(74 − 13 ≈ 62)이 모서리 띠(CORNER_EXTENT 60) 밖에 오게 한다.
const L = 74;
const C = 100;
const R = 126;
const CORNERS4: [number, number][] = [[L, 78], [R, 78], [L, 222], [R, 222]];
const SIDES8: [number, number][] = [[L, 78], [R, 78], [L, 126], [R, 126], [L, 174], [R, 174], [L, 222], [R, 222]];
export const PIPS: Record<number, [number, number][]> = {
  2: [[C, 78], [C, 222]],
  3: [[C, 78], [C, 150], [C, 222]],
  4: CORNERS4,
  5: [...CORNERS4, [C, 150]],
  6: [...CORNERS4, [L, 150], [R, 150]],
  7: [...CORNERS4, [L, 150], [R, 150], [C, 114]],
  8: [...CORNERS4, [L, 150], [R, 150], [C, 114], [C, 186]],
  9: [...SIDES8, [C, 150]],
  10: [...SIDES8, [C, 102], [C, 198]],
};
export const PIP_SIZE = 26;
/** A의 큰 무늬 크기. F-c8: 왼쪽 끝 100 − SUIT_HALF_WIDTH × 84 ≈ 61.4가 모서리 띠 밖이다. */
export const ACE_PIP_SIZE = 84;
/** 무늬 그림의 가장 넓은 반폭(하트·스페이드가 100 상자에서 x 4~96)을 무늬 크기에 대한 비율로. */
export const SUIT_HALF_WIDTH = 0.46;
const NUMBER_OF: Partial<Record<PlayingCard['rank'], number>> = { TWO: 2, THREE: 3, FOUR: 4, FIVE: 5, SIX: 6, SEVEN: 7, EIGHT: 8, NINE: 9, TEN: 10 };

function Center({ card, ink }: { card: PlayingCard; ink: string }) {
  const suit = card.suit as Suit;
  if (card.rank === 'ACE') {
    return <SuitGlyph testId="pip" suit={suit} x={100} y={150} size={ACE_PIP_SIZE} fill={ink} />;
  }
  const count = NUMBER_OF[card.rank];
  if (count !== undefined) {
    return <g>{PIPS[count].map(([x, y], index) => <SuitGlyph key={index} testId="pip" suit={suit} x={x} y={y} size={PIP_SIZE} fill={ink} flip={y > 150} />)}</g>;
  }
  // J·Q·K: 인물 그림 대신 틀 안의 큰 글자와 무늬(우리 디자인).
  return (
    <g data-testid="face-frame">
      <rect x="64" y="62" width="72" height="176" rx="8" fill="none" stroke={ink} strokeWidth="4" />
      <rect x="71" y="69" width="58" height="162" rx="5" fill={ink} fillOpacity="0.08" />
      <text x="100" y="136" textAnchor="middle" dominantBaseline="central" fontSize="80" fontWeight="900" fontFamily={FONT} fill={ink}>{RANK_LABELS[card.rank]}</text>
      <SuitGlyph suit={suit} x={100} y={204} size={40} fill={ink} />
    </g>
  );
}

function JokerArt() {
  return (
    <g data-testid="joker-art">
      <path d="M62 132 L73 74 L89 116 L100 60 L111 116 L127 74 L138 132 Z" fill={JOKER_PURPLE} />
      <rect x="62" y="128" width="76" height="12" rx="6" fill={JOKER_GOLD} />
      <circle cx="73" cy="70" r="9" fill={JOKER_GOLD} /><circle cx="100" cy="56" r="9" fill={JOKER_GOLD} /><circle cx="127" cy="70" r="9" fill={JOKER_GOLD} />
      <circle cx="100" cy="178" r="36" fill="#FFF4D6" stroke={JOKER_PURPLE} strokeWidth="5" />
      <path d="M80 172 Q89 163 98 172 M102 172 Q111 163 120 172" stroke={JOKER_PURPLE} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M82 188 Q100 206 118 188" stroke={JOKER_PURPLE} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M64 228 L76 240 L88 228 L100 240 L112 228 L124 240 L136 228" stroke={JOKER_GOLD} strokeWidth="6" fill="none" strokeLinejoin="round" />
    </g>
  );
}

/**
 * 왼쪽 위 모서리의 큰 랭크 글자 + 그 아래 무늬. 카드가 겹쳐 왼쪽 CORNER_EXTENT(60/200)만 보여도 읽힌다.
 * "10"처럼 두 글자는 textLength로 같은 폭에 맞춘다.
 */
function Corner({ card, ink }: { card: PlayingCard; ink: string }) {
  if (card.rank === 'JOKER') {
    return (
      <g data-testid="corner-index" data-corner="JOKER">
        {/* 겹친 손패에서도 읽히게 '조'·'커'를 세로로 크게 쌓는다. */}
        <text x="32" y="38" textAnchor="middle" dominantBaseline="central" fontSize="40" fontWeight="900" fontFamily={FONT} fill={JOKER_PURPLE}>조</text>
        <text x="32" y="80" textAnchor="middle" dominantBaseline="central" fontSize="40" fontWeight="900" fontFamily={FONT} fill={JOKER_PURPLE}>커</text>
        <path d={STAR} transform="translate(32 116) scale(0.3) translate(-50 -50)" fill={JOKER_GOLD} />
      </g>
    );
  }
  const label = RANK_LABELS[card.rank];
  return (
    <g data-testid="corner-index" data-corner={label}>
      <text x="32" y="44" textAnchor="middle" dominantBaseline="central" fontSize="56" fontWeight="900" fontFamily={FONT} fill={ink}
        textLength={label.length > 1 ? 50 : undefined} lengthAdjust={label.length > 1 ? 'spacingAndGlyphs' : undefined}>{label}</text>
      <SuitGlyph suit={card.suit as Suit} x={32} y={92} size={28} fill={ink} />
    </g>
  );
}

function Back({ width, decorative, className }: { width: number; decorative: boolean; className?: string }) {
  const gradient = useId();
  const lattice = useId();
  return (
    <svg data-testid="playing-card-back" role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : '카드 뒷면'}
      aria-hidden={decorative ? 'true' : undefined} width={width} height={width * 1.5} viewBox="0 0 200 300" className={className}>
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--card-back-from, #23305A)' }} />
          <stop offset="1" style={{ stopColor: 'var(--card-back-to, #3B4C8C)' }} />
        </linearGradient>
        <pattern id={lattice} width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="24" height="24" fill="none" stroke="#fff" strokeOpacity="0.16" strokeWidth="3" />
        </pattern>
      </defs>
      <rect width="200" height="300" rx="16" fill="#fff" />
      <rect x="12" y="12" width="176" height="276" rx="10" fill={`url(#${gradient})`} />
      <rect x="12" y="12" width="176" height="276" rx="10" fill={`url(#${lattice})`} />
      <circle cx="100" cy="150" r="30" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="5" />
      <path d={STAR} transform="translate(100 150) scale(0.3) translate(-50 -50)" fill="#fff" fillOpacity="0.7" />
    </svg>
  );
}

export function PlayingCardFace({ card, width, decorative = false, className }: Props) {
  if (!card) {
    return <Back width={width} decorative={decorative} className={className} />;
  }
  const ink = inkOf(card);
  return (
    <svg data-testid="playing-card" data-card-id={card.id} data-rank={card.rank} data-suit={card.suit ?? 'JOKER'}
      role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : cardName(card)} aria-hidden={decorative ? 'true' : undefined}
      width={width} height={width * 1.5} viewBox="0 0 200 300" className={className}>
      <rect x="1.5" y="1.5" width="197" height="297" rx="16" fill="#fff" stroke="#C9C2B4" strokeWidth="3" />
      {card.rank === 'JOKER' ? <JokerArt /> : <Center card={card} ink={ink} />}
      <Corner card={card} ink={ink} />
      <g transform="rotate(180 100 150)"><Corner card={card} ink={ink} /></g>
    </svg>
  );
}
