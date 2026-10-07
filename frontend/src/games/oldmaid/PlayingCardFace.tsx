import { useId } from 'react';
import type { PlayingCard, Suit } from '../../api/types';
import { cardName, INK_RED, inkOf, JOKER_GOLD, JOKER_PURPLE, RANK_LABELS } from './cards';

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

const OUTLINE = '#1F2430';
const SKIN = '#FFE3C2';
const line = { stroke: OUTLINE, strokeWidth: 2, strokeLinejoin: 'round' as const };

/**
 * 원카드에서 흔히 보는 트럼프 조커처럼 가운데에 광대(어릿광대) 전신을 그린다(우리 디자인).
 * 세 갈래 방울 모자, 웃는 얼굴, 지그재그 깃, 반반 색 옷, 한 손을 들어 인사하는 자세, 끝이 말린 신발.
 * 모든 조각은 x 62~138 안에 둬 겹친 손패의 모서리 띠(60/200)를 침범하지 않는다.
 */
function JokerArt() {
  return (
    <g data-testid="joker-art">
      {/* 모자: 세 갈래 뿔과 끝 방울 */}
      <path data-part="hat" d="M90 100 Q88 64 100 44 Q112 64 110 100 Z" fill={INK_RED} {...line} />
      <path data-part="hat" d="M86 100 Q68 90 68 66 Q86 74 100 96 Z" fill={JOKER_PURPLE} {...line} />
      <path data-part="hat" d="M114 100 Q132 90 132 66 Q114 74 100 96 Z" fill={JOKER_PURPLE} {...line} />
      <circle cx="68" cy="64" r="5" fill={JOKER_GOLD} {...line} />
      <circle cx="100" cy="42" r="5" fill={JOKER_GOLD} {...line} />
      <circle cx="132" cy="64" r="5" fill={JOKER_GOLD} {...line} />
      <rect x="80" y="96" width="40" height="9" rx="4.5" fill={JOKER_GOLD} {...line} />
      {/* 팔: 왼팔은 허리 옆으로, 오른팔은 들어 인사 */}
      <path d="M86 154 Q72 162 68 184 L76 186 Q80 170 92 166 Z" fill={INK_RED} {...line} />
      <circle cx="72" cy="190" r="5" fill={SKIN} {...line} />
      <path d="M114 154 Q128 148 130 126 L122 124 Q120 140 108 164 Z" fill={JOKER_PURPLE} {...line} />
      <circle cx="127" cy="120" r="5" fill={SKIN} {...line} />
      {/* 다리와 끝이 말린 신발 */}
      <path d="M83 210 L99 210 L97 248 L87 248 Z" fill={INK_RED} {...line} />
      <path d="M101 210 L117 210 L113 248 L103 248 Z" fill={JOKER_PURPLE} {...line} />
      <path d="M97 246 L97 256 L80 256 Q72 254 72 246 Q78 250 87 246 Z" fill={JOKER_PURPLE} {...line} />
      <path d="M103 246 L103 256 L120 256 Q128 254 128 246 Q122 250 113 246 Z" fill={INK_RED} {...line} />
      <circle cx="70" cy="244" r="4" fill={JOKER_GOLD} {...line} />
      <circle cx="130" cy="244" r="4" fill={JOKER_GOLD} {...line} />
      {/* 몸통: 반반 색 옷, 가운데 금색 마름모 단추, 허리띠 */}
      <path d="M100 148 L84 150 Q78 180 81 212 L100 212 Z" fill={JOKER_PURPLE} {...line} />
      <path d="M100 148 L116 150 Q122 180 119 212 L100 212 Z" fill={INK_RED} {...line} />
      <path d="M100 160 L104 166 L100 172 L96 166 Z M100 178 L104 184 L100 190 L96 184 Z" fill={JOKER_GOLD} />
      <rect x="81" y="204" width="38" height="7" rx="3" fill={JOKER_GOLD} {...line} />
      {/* 지그재그 깃 */}
      <path d="M76 138 L124 138 L120 152 L113 144 L107 154 L100 145 L93 154 L87 144 L80 152 Z" fill={JOKER_GOLD} {...line} />
      {/* 얼굴: 눈 감고 웃는 얼굴, 빨간 코 */}
      <circle cx="100" cy="121" r="17" fill={SKIN} {...line} />
      <path d="M90 117 Q93.5 112 97 117 M103 117 Q106.5 112 110 117" fill="none" stroke={OUTLINE} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="100" cy="122" r="3" fill={INK_RED} />
      <path d="M91 126 Q100 135 109 126" fill="none" stroke={OUTLINE} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="89" cy="126" r="3" fill="#F49AA0" />
      <circle cx="111" cy="126" r="3" fill="#F49AA0" />
    </g>
  );
}

/**
 * 왼쪽 위 모서리의 큰 랭크 글자 + 그 아래 무늬. 카드가 겹쳐 왼쪽 CORNER_EXTENT(60/200)만 보여도 읽힌다.
 * "10"처럼 두 글자는 textLength로 같은 폭에 맞춘다.
 */
const JOKER_LETTERS = ['J', 'O', 'K', 'E', 'R'];
const JOKER_LETTER_TOP = 34;
const JOKER_LETTER_STEP = 33;
export const JOKER_LETTER_SIZE = 36;

function Corner({ card, ink }: { card: PlayingCard; ink: string }) {
  if (card.rank === 'JOKER') {
    return (
      <g data-testid="corner-index" data-corner="JOKER">
        {/* 트럼프 조커처럼 "JOKER"를 위에서 아래로 한 글자씩 세로로 크게 쌓아 겹친 손패에서도 읽힌다. */}
        {JOKER_LETTERS.map((letter, index) => (
          <text key={index} data-testid="joker-letter" x="32" y={JOKER_LETTER_TOP + index * JOKER_LETTER_STEP} textAnchor="middle" dominantBaseline="central"
            fontSize={JOKER_LETTER_SIZE} fontWeight="900" fontFamily={FONT} fill={JOKER_PURPLE}>{letter}</text>
        ))}
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
