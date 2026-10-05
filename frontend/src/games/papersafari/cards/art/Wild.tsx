import { PALETTE } from '../palette';

const ARCS = [
  ['M50 20 A30 30 0 0 1 78.53 40.73', '#ef4444'],
  ['M78.53 40.73 A30 30 0 0 1 67.63 74.27', '#f97316'],
  ['M67.63 74.27 A30 30 0 0 1 32.37 74.27', '#facc15'],
  ['M32.37 74.27 A30 30 0 0 1 21.47 40.73', '#22c55e'],
  ['M21.47 40.73 A30 30 0 0 1 50 20', '#3b82f6'],
];
const STARS = [[15, 16, 6], [86, 18, 5], [13, 84, 5], [87, 82, 6]];

function star(x: number, y: number, r: number): string {
  return `M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r}Z`;
}

export function Wild() {
  return (
    <g>
      <circle cx="50" cy="50" r="30" fill={PALETTE.cream} />
      {ARCS.map(([d, color]) => <path key={color} d={d} stroke={color} strokeWidth="6" fill="none" />)}
      <text x="50" y="65" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="900" fontSize="44" fill={PALETTE.badgeText}>?</text>
      {STARS.map(([x, y, r]) => <path key={`${x}-${y}`} d={star(x, y, r)} fill={PALETTE.gold} />)}
    </g>
  );
}
