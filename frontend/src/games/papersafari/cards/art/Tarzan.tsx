import { INK, PALETTE } from '../palette';

const SKIN = '#f1c27d';
const SKIN_DARK = '#dba465';
const LEOPARD = '#f5c45a';

export function Tarzan() {
  const leaves = [[14, 22, -30], [20, 50, 20], [16, 80, -20]];
  const spots = [[38, 82], [46, 88], [54, 94], [44, 80], [52, 86], [60, 96]];
  return (
    <g>
      <path d="M6 0 Q30 40 14 100" stroke={PALETTE.green} strokeWidth="5" fill="none" strokeLinecap="round" />
      {leaves.map(([cx, cy, a]) => (
        <ellipse key={cy} cx={cx} cy={cy} rx="8" ry="4" transform={`rotate(${a} ${cx} ${cy})`} fill={PALETTE.grassDark} />
      ))}
      <path d="M28 46 Q24 72 34 76 L70 76 Q80 72 76 46Z" fill={PALETTE.brownDark} />
      <path d="M22 100 Q24 76 52 74 Q80 76 82 100Z" fill={SKIN_DARK} />
      <path d="M32 77 L42 74 L68 100 L54 100Z" fill={LEOPARD} />
      <g fill={INK}>
        {spots.map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.7" />)}
      </g>
      <circle cx="30" cy="52" r="5" fill={SKIN_DARK} />
      <circle cx="74" cy="52" r="5" fill={SKIN_DARK} />
      <circle cx="52" cy="51" r="22" fill={SKIN} />
      <path d="M28 50 Q22 20 52 18 Q82 20 76 50 L72 38 L66 44 L62 33 L56 41 L50 31 L44 41 L38 33 L34 44Z" fill={PALETTE.brownDark} />
      <path d="M40 45 l7 -1.5 M57 43.5 l7 1.5" stroke={PALETTE.brownDark} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="44" cy="51" r="3.4" fill={INK} /><circle cx="45" cy="50" r="1" fill="#fff" />
      <circle cx="60" cy="51" r="3.4" fill={INK} /><circle cx="61" cy="50" r="1" fill="#fff" />
      <path d="M50 54 Q52 58 54 56" stroke={SKIN_DARK} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M42 61 Q52 72 63 61Z" fill={PALETTE.brownDark} />
      <path d="M43.5 62 h18 Q60 64.5 58 65 H47 Q44.5 64 43.5 62Z" fill={PALETTE.white} />
      <circle cx="37" cy="59" r="3.5" fill={PALETTE.pink} opacity="0.6" />
      <circle cx="67" cy="59" r="3.5" fill={PALETTE.pink} opacity="0.6" />
    </g>
  );
}
