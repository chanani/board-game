/** R4: n번째(0부터) 떨어뜨릴 과일의 단계(1~5). mulberry32의 n번째 출력을 바로 셈한다. 32비트 정수 연산만 써서 모든 브라우저에서 같다. */
export function levelAt(seed: number, n: number): number {
  let t = (seed + Math.imul(n + 1, 0x6D2B79F5)) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (((t ^ (t >>> 14)) >>> 0) % 5) + 1;
}
