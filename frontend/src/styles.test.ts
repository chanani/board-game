import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(`${__dirname}/index.css`, 'utf8');

describe('index.css', () => {
  it('누를 수 있는 곳은 손가락 커서, 꺼진 곳은 not-allowed다', () => {
    expect(css).toMatch(/button:not\(:disabled\)[^{]*\{[^}]*cursor:\s*pointer/);
    expect(css).toMatch(/:disabled[^{]*\{[^}]*cursor:\s*not-allowed/);
    expect(css).toMatch(/\[aria-disabled="true"\]/);
  });

  it('차례 링 색 변수는 :root에 있고 해변만 노랑이다', () => {
    expect(css).toMatch(/--turn-ring:\s*var\(--accent\)/);
    const beach = css.match(/\[data-theme="BEACH"\]\s*\{[^}]*\}/)?.[0] ?? '';
    expect(beach).toContain('--turn-ring: #facc15');
    expect(beach).toContain('--turn-halo: #facc15');
    expect(beach).toContain('--turn-tag-bg: #facc15');
    expect(beach).toContain('--turn-tag-ink: #422006');
    expect(css).toMatch(/--turn-halo:\s*var\(--color-cream-50\)/);
    expect(css).toMatch(/@keyframes turn-glow[^\n]*var\(--turn-halo\)/);
  });

  it('우노 뽑을 더미 강조는 카드 윤곽을 따르는 빛이고, 떠오르는 맥박은 움직임을 허락할 때만이다', () => {
    expect(css).toMatch(/\.uno-deck-ready \{ filter: drop-shadow\([^)]*var\(--turn-ring\)\)/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: no-preference\) \{\s*\.uno-deck-ready \{ animation: uno-deck-ready/);
  });
});
