import { useId, type ReactNode } from 'react';
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

const CORNER_X = 44;
const CORNER_Y = 52;
const OUTLINE = '#1F2430';
const OUTLINE_WIDTH = 7;

type Stroke = { ink: string; extra: number };

/** 흰 글자·기호 아래에 어두운 윤곽을 먼저 깔아 노랑 바탕이나 가운데 흰 타원 위에서도 읽히게 한다. */
function Outlined({ draw }: { draw: (stroke: Stroke) => ReactNode }) {
  return (
    <>
      <g strokeOpacity="0.55" fillOpacity="0.55">{draw({ ink: OUTLINE, extra: OUTLINE_WIDTH })}</g>
      {draw({ ink: '#fff', extra: 0 })}
    </>
  );
}

function CornerText({ text, size }: { text: string; size: number }) {
  return (
    <text x={CORNER_X} y={CORNER_Y} textAnchor="middle" dominantBaseline="central" fontSize={size} fontWeight="900" fontFamily={FONT}
      fill="#fff" stroke={OUTLINE} strokeOpacity="0.6" strokeWidth={OUTLINE_WIDTH} strokeLinejoin="round" paintOrder="stroke">{text}</text>
  );
}

const AT_CORNER = (scale: number) => `translate(${CORNER_X} ${CORNER_Y}) scale(${scale}) translate(-100 -150)`;

function CornerSkip() {
  return (
    <g transform={AT_CORNER(0.4)}>
      <Outlined draw={({ ink, extra }) => (
        <g fill="none" stroke={ink} strokeWidth={18 + extra * 2.5} strokeLinecap="round"><circle cx="100" cy="150" r="44" /><path d="M70 180 L130 120" /></g>
      )} />
    </g>
  );
}

function CornerReverse() {
  return (
    <g transform={AT_CORNER(0.42)}>
      <Outlined draw={({ ink, extra }) => (
        <g fill={ink} stroke={ink} strokeLinecap="round" strokeLinejoin="round">
          <path d="M66 166 A44 44 0 0 1 124 108" fill="none" strokeWidth={16 + extra * 2.5} />
          <path d="M112 90 L144 106 L118 130 Z" strokeWidth={extra * 2.5} />
          <path d="M134 134 A44 44 0 0 1 76 192" fill="none" strokeWidth={16 + extra * 2.5} />
          <path d="M88 210 L56 194 L82 170 Z" strokeWidth={extra * 2.5} />
        </g>
      )} />
    </g>
  );
}

/**
 * 진짜 우노 카드처럼 왼쪽 위 모서리에 크고 굵은 숫자·기호를 둔다. 손패가 겹쳐 왼쪽 일부만 보여도 무슨 카드인지 알 수 있다.
 * 가로 CORNER_EXTENT 안에 들어가게 글자 크기를 정했다.
 */
function Corner({ card }: { card: UnoCard }) {
  if (card.kind === 'NUMBER') {
    const underline = card.number === 6 || card.number === 9;
    return (
      <g data-testid="corner-index" data-corner={card.number}>
        <CornerText text={String(card.number)} size={66} />
        {underline ? <rect x={CORNER_X - 14} y={CORNER_Y + 27} width="28" height="6" rx="3" fill="#fff" stroke={OUTLINE} strokeOpacity="0.6" strokeWidth="3" paintOrder="stroke" /> : null}
      </g>
    );
  }
  if (card.kind === 'DRAW_TWO' || card.kind === 'WILD_DRAW_FOUR') {
    return <g data-testid="corner-index" data-corner={card.kind === 'DRAW_TWO' ? '+2' : '+4'}><CornerText text={card.kind === 'DRAW_TWO' ? '+2' : '+4'} size={50} /></g>;
  }
  if (card.kind === 'SKIP') {
    return <g data-testid="corner-index" data-corner="skip"><CornerSkip /></g>;
  }
  if (card.kind === 'REVERSE') {
    return <g data-testid="corner-index" data-corner="reverse"><CornerReverse /></g>;
  }
  return <g data-testid="corner-index" data-corner="wild" transform={AT_CORNER(0.34)}><Wheel /></g>;
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

// 타원은 카드 대각선을 따라 길게(가로 반지름 118, 회전 -60°면 카드 안쪽 폭 176 안에 든다), 글자는 그보다 덜 기울여 힘 있게 둔다.
const BACK_OVAL_TILT = -60;
const BACK_WORD_TILT = -22;
const BACK_RED = '#D93A3A';
const BACK_INK = '#FFF4D6';

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
      {/* 카드 뒷면 무늬: 비스듬한 빨강 타원 위에 굵은 영어 'UNO'(상표 로고 글꼴이 아닌 굵은 일반 글꼴). 작은 크기에서도 뭉개지지 않게 잔무늬 없이 큰 모양만 둔다. */}
      <g data-testid="back-emblem">
        <g transform={`rotate(${BACK_OVAL_TILT} 100 150)`}>
          <ellipse cx="100" cy="150" rx="118" ry="62" fill="#fff" />
          <ellipse data-testid="back-oval" cx="100" cy="150" rx="110" ry="54" fill={BACK_RED} />
        </g>
        <text data-testid="back-word" x="100" y="150" textAnchor="middle" dominantBaseline="central" fontSize="60" fontWeight="900" fontFamily={FONT}
          letterSpacing="-1" fill={BACK_INK} stroke="#1F2430" strokeWidth="10" strokeLinejoin="round" paintOrder="stroke"
          transform={`rotate(${BACK_WORD_TILT} 100 150) skewX(-10) translate(26 0)`}>UNO</text>
      </g>
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
      <Corner card={card} />
      <g transform="rotate(180 100 150)"><Corner card={card} /></g>
      {card.color ? <ColorMark color={card.color} /> : null}
    </svg>
  );
}
