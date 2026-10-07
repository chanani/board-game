import { useId } from 'react';
import type { PlayingCard } from '../../api/types';
import { JOKER_CARD, playingCard } from './cards';
import { PlayingCardFace } from './PlayingCardFace';

const FAN: { card: PlayingCard | null; angle: number }[] = [
  { card: null, angle: -26 },
  { card: playingCard('HEARTS', 'ACE'), angle: -10 },
  { card: playingCard('SPADES', 'ACE'), angle: 8 },
  { card: null, angle: 24 },
];
const WIDTH = 34;

/** 선반·로비용 상자 앞면. 모서리까지 꽉 채우고(둥글기는 감싸는 상자가 맡는다) 맨 앞에 조커, 위에 도둑 가면. */
export function OldMaidBoxArt() {
  const bg = useId();
  return (
    <svg data-testid="old-maid-box-art" viewBox="0 0 120 150" preserveAspectRatio="xMidYMid slice" className="block h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6B1F3A" />
          <stop offset="1" stopColor="#3A0F22" />
        </linearGradient>
      </defs>
      <rect data-testid="old-maid-box-bg" width="120" height="150" fill={`url(#${bg})`} />
      {FAN.map(({ card, angle }, index) => (
        <g key={index} transform={`translate(60 96) rotate(${angle}) translate(${-WIDTH / 2} ${-WIDTH * 1.5})`}>
          <PlayingCardFace card={card} width={WIDTH} decorative />
        </g>
      ))}
      <g transform={`translate(60 102) translate(${-WIDTH / 2} ${-WIDTH * 1.5})`}>
        <PlayingCardFace card={JOKER_CARD} width={WIDTH} decorative />
      </g>
      <g data-testid="box-mask" transform="translate(42 10) scale(1.5)" fill="#1F2430" stroke="#F5E6C8" strokeWidth="1.2" strokeLinejoin="round">
        <path d="M2 9.5c2.5-1.6 6-2.4 10-2.4s7.5.8 10 2.4c-.3 3.6-2.6 6-5.6 6-1.9 0-3.3-1.1-4.4-2.6-1.1 1.5-2.5 2.6-4.4 2.6-3 0-5.3-2.4-5.6-6z" />
        <ellipse cx="7.3" cy="11" rx="2" ry="1.3" fill="#F5E6C8" stroke="none" />
        <ellipse cx="16.7" cy="11" rx="2" ry="1.3" fill="#F5E6C8" stroke="none" />
      </g>
      <text x="60" y="138" textAnchor="middle" fontWeight={900} fontSize="19" fill="#fff" stroke="#3A0F22" strokeWidth="4" paintOrder="stroke">도둑잡기</text>
    </svg>
  );
}
