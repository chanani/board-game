import { FruitIcon } from './FruitIcon';

/** 아래부터 쌓이는 순서(먼저 그린 것이 뒤에 깔린다): 수박 · 멜론과 복숭아 · 귤 · 체리. */
const STACK: { level: number; size: number; x: number; y: number }[] = [
  { level: 11, size: 72, x: 60, y: 84 },
  { level: 10, size: 56, x: 37, y: 46 },
  { level: 8, size: 44, x: 85, y: 50 },
  { level: 4, size: 30, x: 64, y: 27 },
  { level: 1, size: 20, x: 55, y: 11 },
];

/** 선반·로비용 상자 앞면. 모서리까지 꽉 채우고(둥글기는 감싸는 상자가 맡는다) 연두 바탕에 과일이 쌓여 있다. */
export function FruitStackBoxArt() {
  return (
    <svg data-testid="fruit-box-art" viewBox="0 0 120 150" preserveAspectRatio="xMidYMid slice" className="block h-full w-full" aria-hidden="true">
      <rect width="120" height="150" fill="#CDE8A8" />
      <rect y="112" width="120" height="38" fill="#A9D279" />
      {STACK.map(({ level, size, x, y }) => (
        <g key={level} transform={`translate(${x - size / 2} ${y - size / 2})`}>
          <FruitIcon level={level} size={size} />
        </g>
      ))}
      <text x="60" y="140" textAnchor="middle" fontWeight={900} fontSize="19" fill="#fff" stroke="#2F5A1C" strokeWidth="4" paintOrder="stroke">과일 쌓기</text>
    </svg>
  );
}
