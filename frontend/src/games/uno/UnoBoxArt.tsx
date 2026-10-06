import type { UnoCard } from '../../api/types';
import { UnoCardFace } from './UnoCardFace';

const FAN: { card: UnoCard; angle: number }[] = [
  { card: { id: 1, kind: 'NUMBER', color: 'RED', number: 7 }, angle: -24 },
  { card: { id: 2, kind: 'SKIP', color: 'YELLOW', number: null }, angle: -8 },
  { card: { id: 3, kind: 'REVERSE', color: 'GREEN', number: null }, angle: 8 },
  { card: { id: 4, kind: 'DRAW_TWO', color: 'BLUE', number: null }, angle: 24 },
];
const WILD: UnoCard = { id: 5, kind: 'WILD', color: null, number: null };
const WIDTH = 34;

export function UnoBoxArt() {
  return (
    <svg viewBox="0 0 120 150" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="uno-box-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3B4C8C" />
          <stop offset="1" stopColor="#23305A" />
        </linearGradient>
      </defs>
      <rect width="120" height="150" rx="10" fill="url(#uno-box-bg)" />
      {FAN.map(({ card, angle }) => (
        <g key={card.id} transform={`translate(60 92) rotate(${angle}) translate(${-WIDTH / 2} ${-WIDTH * 1.5})`}>
          <UnoCardFace card={card} width={WIDTH} decorative />
        </g>
      ))}
      <g transform={`translate(60 96) translate(${-WIDTH / 2} ${-WIDTH * 1.5})`}>
        <UnoCardFace card={WILD} width={WIDTH} decorative />
      </g>
      <text x="60" y="136" textAnchor="middle" fontWeight={900} fontSize="22" fill="#fff" stroke="#23305A" strokeWidth="4" paintOrder="stroke">우노</text>
    </svg>
  );
}
