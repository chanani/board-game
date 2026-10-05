import { INK, PALETTE } from '../palette';

const GREEN_DARK = '#3a6129';
const GREEN_LIGHT = '#8db86e';

export function Crocodile() {
  return (
    <g>
      <ellipse cx="22" cy="64" rx="22" ry="16" fill={GREEN_DARK} />
      <g fill={GREEN_DARK}>
        <path d="M4 54 L9 42 L14 52Z" /><path d="M13 50 L19 37 L25 48Z" /><path d="M24 48 L30 36 L35 47Z" />
      </g>
      <rect x="34" y="62" width="58" height="13" rx="6.5" fill={GREEN_LIGHT} />
      <path d="M38 63 l3 5 l3 -5 l3 5 l3 -5 l3 5 l3 -5 l3 5 l3 -5 l3 5 l3 -5 l3 5 l3 -5 l3 5 l3 -5 l3 5 l3 -5Z" fill={PALETTE.white} />
      <rect x="28" y="44" width="68" height="20" rx="10" fill={PALETTE.green} />
      <path d="M36 50 h48" stroke={GREEN_DARK} strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
      <circle cx="40" cy="42" r="9" fill={PALETTE.green} />
      <circle cx="55" cy="41" r="8" fill={PALETTE.green} />
      <circle cx="40" cy="41" r="3.6" fill={INK} /><circle cx="41" cy="40" r="1" fill="#fff" />
      <circle cx="55" cy="40" r="3.4" fill={INK} /><circle cx="56" cy="39" r="1" fill="#fff" />
      <circle cx="88" cy="47" r="1.6" fill={GREEN_DARK} />
      <circle cx="92" cy="49" r="1.6" fill={GREEN_DARK} />
      <path d="M0 78 Q12 72 25 78 T50 78 T75 78 T100 78 V100 H0Z" fill="#60a5fa" opacity="0.55" />
      <path d="M8 86 Q16 82 24 86 M58 88 Q66 84 74 88" stroke="#e0f2fe" strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
  );
}
