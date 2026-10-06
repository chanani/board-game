import { useId } from 'react';
import type { UnoCard, UnoColor } from '../../api/types';
import { cardName, COLOR_HEX, isWild, WILD_HEX } from './cards';

type Props = {
  /** null이면 뒷면. */
  card: UnoCard | null;
  /** 카드 폭(px). 높이는 1.5배. */
  width: number;
  /** 상대 뒷면 부채처럼 장식이면 스크린 리더에서 숨긴다. */
  decorative?: boolean;
  className?: string;
};

const MARKS: Record<UnoColor, 'circle' | 'triangle' | 'square' | 'diamond'> = { RED: 'circle', YELLOW: 'triangle', GREEN: 'square', BLUE: 'diamond' };
const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const WHEEL: [UnoColor, string][] = [
  ['RED', 'M100 150 L100 80 A70 70 0 0 1 170 150 Z'],
  ['YELLOW', 'M100 150 L170 150 A70 70 0 0 1 100 220 Z'],
  ['GREEN', 'M100 150 L100 220 A70 70 0 0 1 30 150 Z'],
  ['BLUE', 'M100 150 L30 150 A70 70 0 0 1 100 80 Z'],
];

function Wheel() {
  return <g data-testid="wild-wheel">{WHEEL.map(([color, d]) => <path key={color} d={d} fill={COLOR_HEX[color]} stroke="#fff" strokeWidth="4" />)}</g>;
}

/** 가운데 큰 기호. fill은 기호 색(가운데는 카드 색, 구석은 흰색). */
function Symbol({ card, fill }: { card: UnoCard; fill: string }) {
  if (card.kind === 'NUMBER') {
    const underline = card.number === 6 || card.number === 9;
    return (
      <g>
        <text x="100" y="152" textAnchor="middle" dominantBaseline="central" fontSize="128" fontWeight="900" fontFamily={FONT} fill={fill}>{card.number}</text>
        {underline ? <rect data-testid="underline" x="74" y="214" width="52" height="9" rx="4.5" fill={fill} /> : null}
      </g>
    );
  }
  if (card.kind === 'SKIP') {
    return <g fill="none" stroke={fill} strokeWidth="16" strokeLinecap="round"><circle cx="100" cy="150" r="44" /><path d="M70 180 L130 120" /></g>;
  }
  if (card.kind === 'REVERSE') {
    return (
      <g fill={fill}>
        <path d="M66 166 A44 44 0 0 1 124 108" fill="none" stroke={fill} strokeWidth="15" strokeLinecap="round" />
        <path d="M112 90 L144 106 L118 130 Z" />
        <path d="M134 134 A44 44 0 0 1 76 192" fill="none" stroke={fill} strokeWidth="15" strokeLinecap="round" />
        <path d="M88 210 L56 194 L82 170 Z" />
      </g>
    );
  }
  if (card.kind === 'DRAW_TWO') {
    return <text x="100" y="152" textAnchor="middle" dominantBaseline="central" fontSize="96" fontWeight="900" fontFamily={FONT} fill={fill}>+2</text>;
  }
  return (
    <g>
      <Wheel />
      {card.kind === 'WILD_DRAW_FOUR' ? (
        <text x="100" y="152" textAnchor="middle" dominantBaseline="central" fontSize="72" fontWeight="900" fontFamily={FONT} fill="#fff" stroke={WILD_HEX} strokeWidth="6" paintOrder="stroke">+4</text>
      ) : null}
    </g>
  );
}

function ColorMark({ color }: { color: UnoColor }) {
  const shape = MARKS[color];
  const common = { 'data-testid': 'color-mark', 'data-shape': shape, fill: '#fff', fillOpacity: 0.6 } as const;
  if (shape === 'circle') {
    return <circle {...common} cx="36" cy="262" r="11" />;
  }
  if (shape === 'triangle') {
    return <path {...common} d="M36 249 L48 272 L24 272 Z" />;
  }
  if (shape === 'square') {
    return <rect {...common} x="25" y="251" width="22" height="22" rx="3" />;
  }
  return <path {...common} d="M36 248 L49 262 L36 276 L23 262 Z" />;
}

function Back({ width, decorative, className }: { width: number; decorative: boolean; className?: string }) {
  const gradient = useId();
  return (
    <svg data-testid="uno-card-back" role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : '우노 카드 뒷면'} aria-hidden={decorative ? 'true' : undefined}
      width={width} height={width * 1.5} viewBox="0 0 200 300" className={className}>
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--card-back-from, #23305A)' }} />
          <stop offset="1" style={{ stopColor: 'var(--card-back-to, #3B4C8C)' }} />
        </linearGradient>
      </defs>
      <rect width="200" height="300" rx="20" fill="#fff" />
      <rect x="12" y="12" width="176" height="276" rx="14" fill={`url(#${gradient})`} />
      <g fill="none" stroke="#fff" strokeOpacity="0.18">
        <circle cx="100" cy="150" r="82" strokeWidth="10" />
        <circle cx="100" cy="150" r="58" strokeWidth="6" />
      </g>
      <text x="100" y="152" textAnchor="middle" dominantBaseline="central" fontSize="58" fontWeight="900" fontFamily={FONT} fill="#fff">우노</text>
    </svg>
  );
}

export function UnoCardFace({ card, width, decorative = false, className }: Props) {
  if (!card) {
    return <Back width={width} decorative={decorative} className={className} />;
  }
  const wild = isWild(card);
  const color = card.color ? COLOR_HEX[card.color] : WILD_HEX;
  return (
    <svg data-testid="uno-card" data-kind={card.kind} data-color={card.color ?? 'WILD'}
      role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : cardName(card)} aria-hidden={decorative ? 'true' : undefined}
      width={width} height={width * 1.5} viewBox="0 0 200 300" className={className}>
      <rect width="200" height="300" rx="20" fill="#fff" />
      <rect x="12" y="12" width="176" height="276" rx="14" fill={color} />
      {wild ? null : <ellipse cx="100" cy="150" rx="70" ry="123" fill="#fff" />}
      <Symbol card={card} fill={color} />
      <g transform="translate(16 16) scale(0.26)"><Symbol card={card} fill="#fff" /></g>
      <g transform="rotate(180 100 150) translate(16 16) scale(0.26)"><Symbol card={card} fill="#fff" /></g>
      {card.color ? <ColorMark color={card.color} /> : null}
    </svg>
  );
}
