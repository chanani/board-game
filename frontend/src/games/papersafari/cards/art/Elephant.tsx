import { INK, PALETTE } from '../palette';

export function Elephant() {
  return (
    <g>
      <ellipse cx="22" cy="46" rx="21" ry="26" fill={PALETTE.gray} />
      <ellipse cx="78" cy="46" rx="21" ry="26" fill={PALETTE.gray} />
      <ellipse cx="22" cy="47" rx="13" ry="18" fill={PALETTE.pink} opacity="0.5" />
      <ellipse cx="78" cy="47" rx="13" ry="18" fill={PALETTE.pink} opacity="0.5" />
      <circle cx="50" cy="44" r="24" fill={PALETTE.gray} />
      <path d="M41 60 Q34 70 40 77" stroke={PALETTE.white} strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <path d="M59 60 Q66 70 60 77" stroke={PALETTE.white} strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <path d="M50 52 Q50 76 46 86 Q43 94 53 92" stroke={PALETTE.gray} strokeWidth="11" fill="none" strokeLinecap="round" />
      <path d="M46 70 h7 M45 77 h7" stroke={PALETTE.grayDark} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="35" cy="52" r="4" fill={PALETTE.pink} opacity="0.6" />
      <circle cx="65" cy="52" r="4" fill={PALETTE.pink} opacity="0.6" />
      <circle cx="41" cy="41" r="3.6" fill={INK} /><circle cx="42" cy="40" r="1" fill="#fff" />
      <circle cx="59" cy="41" r="3.6" fill={INK} /><circle cx="60" cy="40" r="1" fill="#fff" />
    </g>
  );
}
