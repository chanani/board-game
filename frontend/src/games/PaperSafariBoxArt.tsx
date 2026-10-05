import { Lion } from './papersafari/cards/art/Lion';

export function PaperSafariBoxArt() {
  return (
    <svg viewBox="0 0 120 150" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="box-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde7b0" />
          <stop offset="1" stopColor="#f6c66e" />
        </linearGradient>
      </defs>
      <rect width="120" height="150" fill="url(#box-sky)" />
      <circle cx="88" cy="70" r="22" fill="#fb923c" opacity="0.55" />
      <rect y="92" width="120" height="58" fill="#6aa04f" />
      <path d="M0 92 Q30 86 60 92 T120 92 V100 H0Z" fill="#5f9a4a" />
      <rect x="14" y="70" width="3" height="22" fill="#6b4423" />
      <ellipse cx="15.5" cy="70" rx="14" ry="5" fill="#4d7c3a" />
      <text x="60" y="26" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="900" fontSize="17" fill="#7a2e0a"
        stroke="#fffaf0" strokeWidth="3" paintOrder="stroke">페이퍼</text>
      <text x="60" y="46" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="900" fontSize="17" fill="#7a2e0a"
        stroke="#fffaf0" strokeWidth="3" paintOrder="stroke">사파리</text>
      <g data-box-hero="true" transform="translate(32 92) scale(0.56)"><Lion /></g>
    </svg>
  );
}
