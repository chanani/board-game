import { useId } from 'react';
import { Lion } from './art/Lion';

// 색과 무늬 각도는 방 테마 변수(index.css [data-theme])에서 읽고, 변수가 없으면 원목 테마 값을 쓴다.
const FILL = {
  a: { fill: 'var(--back-a, #1f6f45)' },
  b: { fill: 'var(--back-b, #25804f)' },
  frame: { fill: 'var(--back-frame, #fffaf0)' },
  seal: { fill: 'var(--seal-fill, #fffaf0)', stroke: 'var(--seal-ring, #f2b33d)' },
};
// 세로 줄무늬를 원점 기준으로 돌려 테마마다 다른 각도의 사선을 만든다(원목 45도 = 예전 무늬 그대로).
const TILT = { transform: 'rotate(var(--back-angle, 45deg))', transformOrigin: '0 0', transformBox: 'view-box' } as const;

export function CardBack() {
  // 같은 id가 여러 장에 겹치면 숨겨진(visibility: hidden) 첫 카드의 무늬를 모두가 빌려 써서 뒷면이 하얗게 비므로 카드마다 다른 id를 쓴다.
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const stripes = `back-stripes-${id}`;
  const clip = `back-clip-${id}`;
  return (
    <svg viewBox="0 0 100 140" className="block h-full w-full" aria-hidden="true">
      <defs>
        <pattern id={stripes} width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" style={FILL.a} />
          <rect width="6" height="12" style={FILL.b} />
        </pattern>
        <clipPath id={clip}>
          <rect x="6" y="6" width="88" height="128" rx="6" />
        </clipPath>
      </defs>
      <rect width="100" height="140" rx="9" style={FILL.frame} />
      <g clipPath={`url(#${clip})`}>
        <rect x="-200" y="-200" width="400" height="400" fill={`url(#${stripes})`} style={TILT} />
      </g>
      <circle cx="50" cy="70" r="24" strokeWidth="4" style={FILL.seal} />
      <g transform="translate(31 51) scale(0.38)"><Lion /></g>
    </svg>
  );
}
