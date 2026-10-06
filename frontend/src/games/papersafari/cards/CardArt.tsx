import { useId } from 'react';
import type { CardView } from '../../../api/types';
import { animalName } from '../cards';
import { ART_BY_KEY, artKeyOf } from './art';
import { PALETTE } from './palette';

export function CardArt({ card }: { card: CardView }) {
  const key = artKeyOf(card);
  const Art = ART_BY_KEY[key];
  const fox = card.kind === 'FOX';
  const special = card.kind !== 'NUMBER';
  const gid = `sky-${key}-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <svg viewBox="0 0 100 140" className="block h-full w-full" data-art={key} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={fox ? PALETTE.foxSkyTop : PALETTE.skyTop} />
          <stop offset="1" stopColor={fox ? PALETTE.foxSkyBottom : PALETTE.skyBottom} />
        </linearGradient>
      </defs>
      <rect width="100" height="140" rx="9" fill={special ? PALETTE.gold : PALETTE.cream} />
      <rect x="4" y="4" width="92" height="132" rx="6" fill={`url(#${gid})`} />
      <path d="M4 82 Q30 76 50 82 T96 80 V130 Q96 136 90 136 H10 Q4 136 4 130Z" fill={fox ? PALETTE.foxGrass : PALETTE.grass} />
      <path d="M4 96 Q35 90 60 96 T96 94 V130 Q96 136 90 136 H10 Q4 136 4 130Z" fill={PALETTE.grassDark} opacity="0.45" />
      <g transform="translate(6 28) scale(0.88)"><Art /></g>
      <circle cx="19" cy="19" r="13" fill={fox ? PALETTE.foxBadge : PALETTE.cream} stroke={special ? PALETTE.gold : '#e6dcc4'} strokeWidth="2" />
      <text x="19" y="24.5" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="900" fontSize={card.value <= -10 || card.value >= 10 ? 12 : 15}
        fill={fox ? PALETTE.cream : PALETTE.badgeText}>{card.kind === 'WILD' ? '?' : card.value}</text>
      <rect x="22" y="119" width="56" height="13" rx="3" fill={PALETTE.cream} opacity="0.92" />
      <text x="50" y="129" textAnchor="middle" fontSize="9" fontWeight="700" fill={PALETTE.badgeText}>{animalName(card)}</text>
    </svg>
  );
}
