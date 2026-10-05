import { INK, PALETTE } from '../palette';

export function Mouse() {
  const whiskers = ['M38 67 L18 62', 'M38 70 L17 71', 'M39 73 L20 79', 'M62 67 L82 62', 'M62 70 L83 71', 'M61 73 L80 79'];
  return (
    <g>
      <path d="M70 88 Q92 88 90 70 Q89 60 82 62" stroke={PALETTE.pink} strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="50" cy="86" rx="22" ry="13" fill={PALETTE.grayDark} />
      <circle cx="26" cy="30" r="17" fill={PALETTE.gray} />
      <circle cx="74" cy="30" r="17" fill={PALETTE.gray} />
      <circle cx="26" cy="31" r="10.5" fill={PALETTE.pink} />
      <circle cx="74" cy="31" r="10.5" fill={PALETTE.pink} />
      <circle cx="50" cy="56" r="24" fill={PALETTE.gray} />
      <ellipse cx="50" cy="70" rx="13" ry="10" fill="#d1d5db" />
      <circle cx="35" cy="64" r="4" fill={PALETTE.pink} opacity="0.7" />
      <circle cx="65" cy="64" r="4" fill={PALETTE.pink} opacity="0.7" />
      <circle cx="41" cy="54" r="3.6" fill={INK} /><circle cx="42" cy="53" r="1" fill="#fff" />
      <circle cx="59" cy="54" r="3.6" fill={INK} /><circle cx="60" cy="53" r="1" fill="#fff" />
      <circle cx="50" cy="65" r="4" fill="#ec7f98" />
      <path d="M50 69 v3 M50 72 q-3 3 -5 1 M50 72 q3 3 5 1" stroke={PALETTE.grayDark} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <g stroke={PALETTE.grayDark} strokeWidth="1.3" strokeLinecap="round">
        {whiskers.map((d) => <path key={d} d={d} />)}
      </g>
    </g>
  );
}
