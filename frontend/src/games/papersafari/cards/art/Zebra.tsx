import { INK, PALETTE } from '../palette';

export function Zebra() {
  const stripes = [
    'M36 20 Q50 30 64 20', 'M33 31 Q50 40 67 31',
    'M34 52 Q42 53 46 58', 'M66 52 Q58 53 54 58', 'M36 62 Q41 63 44 66', 'M64 62 Q59 63 56 66',
  ];
  return (
    <g>
      <path d="M36 70 L30 100 H70 L64 70Z" fill={PALETTE.white} />
      <g stroke={INK} strokeWidth="4.5" strokeLinecap="round" fill="none">
        <path d="M34 82 Q50 88 66 82" /><path d="M32 94 Q50 100 68 94" />
      </g>
      <g transform="rotate(-20 31 18)">
        <ellipse cx="31" cy="18" rx="6" ry="12" fill={PALETTE.white} />
        <ellipse cx="31" cy="19" rx="3" ry="7" fill={PALETTE.gray} />
      </g>
      <g transform="rotate(20 69 18)">
        <ellipse cx="69" cy="18" rx="6" ry="12" fill={PALETTE.white} />
        <ellipse cx="69" cy="19" rx="3" ry="7" fill={PALETTE.gray} />
      </g>
      <path d="M38 14 L41 3 L45 11 L50 1 L55 11 L59 3 L62 14Z" fill={INK} />
      <path d="M30 30 Q30 12 50 12 Q70 12 70 30 L65 70 Q50 78 35 70Z" fill={PALETTE.white} />
      <path d="M58 14 Q70 16 70 30 L65 70 Q60 73 56 74 Q63 50 58 14Z" fill="#e7e5e4" />
      <g stroke={INK} strokeWidth="4.5" strokeLinecap="round" fill="none">
        {stripes.map((d) => <path key={d} d={d} />)}
      </g>
      <ellipse cx="50" cy="76" rx="17" ry="13" fill="#4b4540" />
      <ellipse cx="43" cy="75" rx="2.6" ry="3.4" fill={INK} />
      <ellipse cx="57" cy="75" rx="2.6" ry="3.4" fill={INK} />
      <path d="M43 83 Q50 87 57 83" stroke={INK} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <circle cx="40" cy="44" r="3.6" fill={INK} /><circle cx="41" cy="43" r="1" fill="#fff" />
      <circle cx="60" cy="44" r="3.6" fill={INK} /><circle cx="61" cy="43" r="1" fill="#fff" />
    </g>
  );
}
