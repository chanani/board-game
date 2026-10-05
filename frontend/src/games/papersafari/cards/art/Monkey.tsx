import { INK, PALETTE } from '../palette';

export function Monkey() {
  return (
    <g>
      <ellipse cx="50" cy="91" rx="22" ry="10" fill={PALETTE.brownDark} />
      <circle cx="21" cy="52" r="11" fill={PALETTE.brown} />
      <circle cx="79" cy="52" r="11" fill={PALETTE.brown} />
      <circle cx="21" cy="52" r="6" fill={PALETTE.muzzle} />
      <circle cx="79" cy="52" r="6" fill={PALETTE.muzzle} />
      <circle cx="50" cy="52" r="28" fill={PALETTE.brown} />
      <path d="M44 26 Q42 16 50 18 M50 25 Q50 14 58 16 M56 27 Q60 19 66 22" stroke={PALETTE.brownDark} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <g fill={PALETTE.muzzle}>
        <circle cx="40" cy="47" r="11" />
        <circle cx="60" cy="47" r="11" />
        <ellipse cx="50" cy="64" rx="19" ry="14" />
      </g>
      <circle cx="41" cy="47" r="3.6" fill={INK} /><circle cx="42" cy="46" r="1" fill="#fff" />
      <circle cx="59" cy="47" r="3.6" fill={INK} /><circle cx="60" cy="46" r="1" fill="#fff" />
      <circle cx="46.5" cy="58" r="1.6" fill={PALETTE.brownDark} />
      <circle cx="53.5" cy="58" r="1.6" fill={PALETTE.brownDark} />
      <path d="M40 64 Q50 75 60 64" stroke={PALETTE.brownDark} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <circle cx="34" cy="62" r="3.5" fill={PALETTE.pink} opacity="0.6" />
      <circle cx="66" cy="62" r="3.5" fill={PALETTE.pink} opacity="0.6" />
    </g>
  );
}
