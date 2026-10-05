import { INK, PALETTE } from '../palette';

export function Lion() {
  const mane = [[20, 35], [80, 35], [18, 62], [82, 62], [35, 16], [65, 16], [35, 84], [65, 84], [50, 12], [50, 88]];
  return (
    <g>
      <g fill={PALETTE.mane}>
        <circle cx="50" cy="50" r="38" />
        {mane.map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="12" />)}
      </g>
      <circle cx="33" cy="30" r="8" fill={PALETTE.tan} />
      <circle cx="67" cy="30" r="8" fill={PALETTE.tan} />
      <circle cx="50" cy="52" r="27" fill={PALETTE.tan} />
      <ellipse cx="50" cy="65" rx="14" ry="11" fill={PALETTE.muzzle} />
      <circle cx="40" cy="47" r="3.6" fill={INK} /><circle cx="41" cy="46" r="1" fill="#fff" />
      <circle cx="60" cy="47" r="3.6" fill={INK} /><circle cx="61" cy="46" r="1" fill="#fff" />
      <path d="M44.5 58 h11 l-5.5 6z" fill={PALETTE.brownDark} />
      <path d="M50 64 q-5 6 -9 3 M50 64 q5 6 9 3" stroke={PALETTE.brownDark} strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
  );
}
