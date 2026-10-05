import { INK, PALETTE } from '../palette';

export function Rabbit() {
  return (
    <g>
      <ellipse cx="50" cy="92" rx="20" ry="9" fill="#e7e2d6" />
      <g transform="rotate(-10 37 30)">
        <ellipse cx="37" cy="28" rx="9" ry="27" fill={PALETTE.white} />
        <ellipse cx="37" cy="30" rx="4.5" ry="19" fill={PALETTE.pink} />
      </g>
      <g transform="rotate(10 63 30)">
        <ellipse cx="63" cy="28" rx="9" ry="27" fill={PALETTE.white} />
        <ellipse cx="63" cy="30" rx="4.5" ry="19" fill={PALETTE.pink} />
      </g>
      <circle cx="50" cy="64" r="23" fill={PALETTE.white} />
      <path d="M28 70 Q50 92 72 70 Q66 86 50 87 Q34 86 28 70Z" fill="#ece7dc" />
      <circle cx="35" cy="70" r="4.5" fill={PALETTE.pink} opacity="0.7" />
      <circle cx="65" cy="70" r="4.5" fill={PALETTE.pink} opacity="0.7" />
      <circle cx="41" cy="60" r="3.6" fill={INK} /><circle cx="42" cy="59" r="1" fill="#fff" />
      <circle cx="59" cy="60" r="3.6" fill={INK} /><circle cx="60" cy="59" r="1" fill="#fff" />
      <path d="M46.5 67 h7 l-3.5 4z" fill="#ec7f98" />
      <path d="M50 71 q-4 4 -7 2 M50 71 q4 4 7 2" stroke="#b79f8a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <rect x="47" y="73" width="3" height="5" rx="0.8" fill={PALETTE.white} stroke="#d6cfc2" strokeWidth="0.6" />
      <rect x="50" y="73" width="3" height="5" rx="0.8" fill={PALETTE.white} stroke="#d6cfc2" strokeWidth="0.6" />
    </g>
  );
}
