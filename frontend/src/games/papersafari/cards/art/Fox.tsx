import { INK, PALETTE } from '../palette';

const FUR = '#e8742a';
const FUR_DARK = '#c85a1a';

export function Fox() {
  return (
    <g>
      <path d="M34 100 Q36 80 50 78 Q64 80 66 100Z" fill={FUR_DARK} />
      <path d="M18 40 L20 4 L44 28Z" fill={FUR} />
      <path d="M82 40 L80 4 L56 28Z" fill={FUR} />
      <path d="M23 32 L24 13 L37 27Z" fill={INK} opacity="0.35" />
      <path d="M77 32 L76 13 L63 27Z" fill={INK} opacity="0.35" />
      <path d="M14 36 Q50 22 86 36 Q84 58 50 88 Q16 58 14 36Z" fill={FUR} />
      <path d="M40 28 Q50 24 60 28 L50 44Z" fill={FUR_DARK} />
      <path d="M18 46 Q36 50 50 62 Q64 50 82 46 Q74 68 50 88 Q26 68 18 46Z" fill={PALETTE.cream} />
      <ellipse cx="37" cy="46" rx="4.5" ry="2.6" transform="rotate(18 37 46)" fill={INK} />
      <ellipse cx="63" cy="46" rx="4.5" ry="2.6" transform="rotate(-18 63 46)" fill={INK} />
      <circle cx="38" cy="45.3" r="0.9" fill="#fff" />
      <circle cx="64" cy="45.3" r="0.9" fill="#fff" />
      <circle cx="50" cy="82" r="4.5" fill={INK} /><circle cx="51.3" cy="80.8" r="1" fill="#fff" />
      <path d="M44 71 Q50 75 56 71" stroke={FUR_DARK} strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </g>
  );
}
