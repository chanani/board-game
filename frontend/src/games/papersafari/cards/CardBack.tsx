import { useId } from 'react';
import { Lion } from './art/Lion';

export function CardBack() {
  // 같은 id가 여러 장에 겹치면 숨겨진(visibility: hidden) 첫 카드의 무늬를 모두가 빌려 써서 뒷면이 하얗게 비므로 카드마다 다른 id를 쓴다.
  const stripes = `back-stripes-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <svg viewBox="0 0 100 140" className="block h-full w-full" aria-hidden="true">
      <defs>
        <pattern id={stripes} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="12" height="12" fill="#1f6f45" />
          <rect width="6" height="12" fill="#25804f" />
        </pattern>
      </defs>
      <rect width="100" height="140" rx="9" fill="#fffaf0" />
      <rect x="6" y="6" width="88" height="128" rx="6" fill={`url(#${stripes})`} />
      <circle cx="50" cy="70" r="24" fill="#fffaf0" stroke="#f2b33d" strokeWidth="4" />
      <g transform="translate(31 51) scale(0.38)"><Lion /></g>
    </svg>
  );
}
