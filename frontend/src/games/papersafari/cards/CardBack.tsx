import { Lion } from './art/Lion';

export function CardBack() {
  return (
    <svg viewBox="0 0 100 140" className="block h-full w-full" aria-hidden="true">
      <defs>
        <pattern id="back-stripes" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="12" height="12" fill="#1f6f45" />
          <rect width="6" height="12" fill="#25804f" />
        </pattern>
      </defs>
      <rect width="100" height="140" rx="9" fill="#fffaf0" />
      <rect x="6" y="6" width="88" height="128" rx="6" fill="url(#back-stripes)" />
      <circle cx="50" cy="70" r="24" fill="#fffaf0" stroke="#f2b33d" strokeWidth="4" />
      <g transform="translate(31 51) scale(0.38)"><Lion /></g>
    </svg>
  );
}
