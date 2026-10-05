import { INK, PALETTE } from '../palette';

const SKIN = '#a79bb5';
const SKIN_LIGHT = '#c4b8d1';
const SKIN_DARK = '#7c6f8a';

export function Hippo() {
  return (
    <g>
      <circle cx="27" cy="24" r="6.5" fill={SKIN} /><circle cx="27" cy="24" r="3.5" fill={PALETTE.pink} />
      <circle cx="73" cy="24" r="6.5" fill={SKIN} /><circle cx="73" cy="24" r="3.5" fill={PALETTE.pink} />
      <circle cx="38" cy="32" r="9" fill={SKIN} />
      <circle cx="62" cy="32" r="9" fill={SKIN} />
      <ellipse cx="50" cy="46" rx="31" ry="22" fill={SKIN} />
      <ellipse cx="50" cy="68" rx="35" ry="21" fill={SKIN_LIGHT} />
      <path d="M17 72 Q50 96 83 72 Q78 88 50 89 Q22 88 17 72Z" fill={SKIN} opacity="0.6" />
      <ellipse cx="39" cy="59" rx="3.4" ry="2.4" fill={SKIN_DARK} />
      <ellipse cx="61" cy="59" rx="3.4" ry="2.4" fill={SKIN_DARK} />
      <path d="M30 73 Q50 82 70 73" stroke={SKIN_DARK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <rect x="38" y="76" width="5" height="7" rx="1.5" fill={PALETTE.white} />
      <rect x="57" y="76" width="5" height="7" rx="1.5" fill={PALETTE.white} />
      <circle cx="24" cy="62" r="4.5" fill={PALETTE.pink} opacity="0.6" />
      <circle cx="76" cy="62" r="4.5" fill={PALETTE.pink} opacity="0.6" />
      <circle cx="38" cy="32" r="3.6" fill={INK} /><circle cx="39" cy="31" r="1" fill="#fff" />
      <circle cx="62" cy="32" r="3.6" fill={INK} /><circle cx="63" cy="31" r="1" fill="#fff" />
    </g>
  );
}
