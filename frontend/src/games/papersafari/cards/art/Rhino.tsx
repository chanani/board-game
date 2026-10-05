import { INK, PALETTE } from '../palette';

const HORN = '#e5e1d8';

export function Rhino() {
  return (
    <g>
      <ellipse cx="20" cy="78" rx="18" ry="22" fill={PALETTE.grayDark} />
      <g transform="rotate(-20 25 24)">
        <ellipse cx="25" cy="24" rx="6" ry="11" fill={PALETTE.gray} />
        <ellipse cx="25" cy="25" rx="3" ry="6.5" fill={PALETTE.pink} />
      </g>
      <path d="M14 42 Q18 26 42 28 L76 46 Q92 54 89 70 Q82 84 60 82 L26 78 Q10 70 14 42Z" fill={PALETTE.gray} />
      <ellipse cx="76" cy="71" rx="14" ry="9" fill="#bfc4cb" />
      <path d="M55 42 Q59 30 65 25 Q66 35 68 45Z" fill="#cfc9bc" />
      <path d="M69 52 Q78 28 92 14 Q89 35 87 58Z" fill={HORN} />
      <path d="M28 54 Q33 63 29 72 M35 52 Q40 61 36 70" stroke={PALETTE.grayDark} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <circle cx="84" cy="63" r="1.8" fill={PALETTE.grayDark} />
      <path d="M88 74 Q80 77 72 74" stroke={PALETTE.grayDark} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <circle cx="47" cy="47" r="3.6" fill={INK} /><circle cx="48" cy="46" r="1" fill="#fff" />
      <circle cx="56" cy="62" r="4" fill={PALETTE.pink} opacity="0.5" />
    </g>
  );
}
