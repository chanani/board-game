import { INK, PALETTE } from '../palette';

export function Giraffe() {
  const spots = [[50, 50, 5], [59, 60, 5.5], [49, 70, 5], [61, 80, 6], [50, 91, 5], [57, 47, 3]];
  return (
    <g>
      <path d="M36 100 L45 38 L48 38 L40 100Z" fill={PALETTE.brownDark} />
      <path d="M39 100 L47 38 L62 38 L68 100Z" fill={PALETTE.tan} />
      <path d="M58 38 L62 38 L68 100 L62 100Z" fill="#d99a3f" />
      {spots.map(([cx, cy, r]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={PALETTE.mane} />)}
      <path d="M50 22 L47 8 M60 20 L60 6" stroke={PALETTE.brownDark} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="47" cy="7" r="4" fill={PALETTE.brownDark} />
      <circle cx="60" cy="5" r="4" fill={PALETTE.brownDark} />
      <ellipse cx="40" cy="24" rx="9" ry="4.5" transform="rotate(-25 40 24)" fill={PALETTE.tan} />
      <ellipse cx="40" cy="24" rx="5" ry="2" transform="rotate(-25 40 24)" fill={PALETTE.pink} />
      <ellipse cx="58" cy="30" rx="19" ry="13" transform="rotate(12 58 30)" fill={PALETTE.tan} />
      <ellipse cx="74" cy="38" rx="11" ry="9" fill={PALETTE.muzzle} />
      <circle cx="49" cy="33" r="3" fill={PALETTE.mane} />
      <circle cx="57" cy="22" r="2.4" fill={PALETTE.mane} />
      <circle cx="78" cy="35" r="1.6" fill={PALETTE.brownDark} />
      <path d="M70 43 Q75 46 80 42" stroke={PALETTE.brownDark} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <circle cx="61" cy="29" r="3.4" fill={INK} /><circle cx="62" cy="28" r="1" fill="#fff" />
      <circle cx="66" cy="38" r="3" fill={PALETTE.pink} opacity="0.6" />
    </g>
  );
}
