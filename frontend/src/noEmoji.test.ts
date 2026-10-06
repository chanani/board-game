import { describe, expect, it } from 'vitest';

// 화면에 이모지를 쓰지 않는다(직접 그린 SVG 아이콘만). 테스트 파일은 "이모지가 없다"는 부정 단언에 이모지를 쓸 수 있어 뺀다.
const sources = {
  ...import.meta.glob(['./**/*.{ts,tsx,css}', '!./**/*.test.{ts,tsx}'], { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob('../index.html', { query: '?raw', import: 'default', eager: true }),
} as Record<string, string>;
const EMOJI = /\p{Extended_Pictographic}/u;

describe('이모지 없음', () => {
  it('src의 소스·CSS 파일과 index.html에 이모지 코드포인트가 없다', () => {
    const offenders = Object.entries(sources).flatMap(([path, text]) =>
      text.split('\n').flatMap((line, index) => (EMOJI.test(line) ? [`${path}:${index + 1}: ${line.trim()}`] : [])));

    expect(Object.keys(sources).length).toBeGreaterThan(50);
    expect(Object.keys(sources)).toContain('../index.html');
    expect(Object.keys(sources).some((path) => path.endsWith('.css'))).toBe(true);
    expect(offenders).toEqual([]);
  });
});
