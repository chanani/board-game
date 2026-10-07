import { useId } from 'react';
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

/**
 * 상자 앞면은 모서리까지 꽉 채운다. 둥근 모서리(rx)를 두면 비어 있는 모서리로 상자 옆면·그림자 색이 새어 보이므로
 * 둥글기는 감싸는 상자(rounded + overflow-hidden)에 맡긴다. 상자 비율이 달라도 빈 띠가 생기지 않게 slice로 채운다.
 */
export function UnoBoxArt() {
  const bg = useId();
  return (
    <svg data-testid="uno-box-art" viewBox="0 0 120 150" preserveAspectRatio="xMidYMid slice" className="block h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3B4C8C" />
          <stop offset="1" stopColor="#23305A" />
        </linearGradient>
      </defs>
      <rect data-testid="uno-box-bg" width="120" height="150" fill={`url(#${bg})`} />
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
