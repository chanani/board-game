import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(`${__dirname}/index.css`, 'utf8');

describe('index.css', () => {
  it('누를 수 있는 곳은 손가락 커서, 꺼진 곳은 not-allowed다', () => {
    expect(css).toMatch(/button:not\(:disabled\)[^{]*\{[^}]*cursor:\s*pointer/);
    expect(css).toMatch(/:disabled[^{]*\{[^}]*cursor:\s*not-allowed/);
    expect(css).toMatch(/\[aria-disabled="true"\]/);
  });

  it('차례 링 색 변수는 :root에 있고 벚꽃만 따로 정한다(분홍 펠트 위에서 보이게 흰 링에 짙은 테두리)', () => {
    expect(css).toMatch(/--turn-ring:\s*var\(--accent\)/);
    const blossom = css.match(/\[data-theme="BLOSSOM"\]\s*\{[^}]*\}/)?.[0] ?? '';
    expect(blossom).toContain('--turn-ring: #ffffff');
    expect(blossom).toContain('--turn-ring-edge: #9d174d');
    expect(blossom).toContain('--turn-halo: #ffffff');
    expect(blossom).toContain('--turn-tag-bg: #9d174d');
    expect(blossom).toContain('--turn-tag-ink: #fff1f5');
    expect(css.match(/--turn-ring:/g)).toHaveLength(2);
    expect(css).toMatch(/--turn-halo:\s*var\(--color-cream-50\)/);
    expect(css).toMatch(/@keyframes turn-glow[^\n]*var\(--turn-halo\)/);
  });

  it('우노 뽑을 더미 강조는 카드 윤곽을 따르는 빛이고, 떠오르는 맥박은 움직임을 허락할 때만이다', () => {
    expect(css).toMatch(/\.uno-deck-ready \{ filter: drop-shadow\([^)]*var\(--turn-ring\)\)/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: no-preference\) \{\s*\.uno-deck-ready \{ animation: uno-deck-ready/);
  });

  const block = (theme: string) => css.match(new RegExp(`\\[data-theme="${theme}"\\]\\s*\\{[^}]*\\}`))?.[0] ?? '';
  const TOKENS = ['--room-bg', '--felt-bg', '--rim-1', '--rim-2', '--table-shadow', '--felt-ink', '--felt-ink-muted', '--back-a', '--back-b', '--back-angle',
    '--back-frame', '--seal-fill', '--seal-ring', '--accent', '--accent-hover', '--accent-text', '--accent-shadow', '--status-bg', '--status-border',
    '--plate-bg', '--plate-text', '--pill-bg', '--pill-bg-strong', '--pill-ink', '--timer-bg', '--timer-ink', '--timer-ring'];

  it('방 테마 다섯 가지가 모두 같은 변수를 정한다(벚꽃 포함)', () => {
    ['SUNSET', 'MOONLIT', 'AURORA', 'BLOSSOM'].forEach((theme) => {
      const missing = TOKENS.filter((token) => !block(theme).includes(`${token}:`));
      expect({ theme, missing }).toEqual({ theme, missing: [] });
    });
    expect(css).toMatch(/:root,\s*\[data-theme="WOOD"\]/);
  });

  it('열대 해변 테마는 남아 있지 않고, 벚꽃 장면 장식은 인라인 SVG다', () => {
    expect(css).not.toContain('BEACH');
    expect(css).toMatch(/\.room-scene\[data-theme="BLOSSOM"\]::before \{[^}]*url\("data:image\/svg\+xml,/);
    expect(css).toMatch(/\.room-scene\[data-theme="BLOSSOM"\]::after \{/);
  });

  // WCAG 대비: 벚꽃 테마의 글자·버튼이 읽히는지 색 값으로 확인한다.
  const hex = (theme: string, token: string) => block(theme).match(new RegExp(`${token}:\\s*(#[0-9a-f]{6})`))?.[1] ?? '';
  const luminance = (color: string) => {
    const channel = (at: number) => {
      const value = parseInt(color.slice(at, at + 2), 16) / 255;
      return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  };
  const contrast = (a: string, b: string) => {
    const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (high + 0.05) / (low + 0.05);
  };

  it('벚꽃 테마: 펠트 글자·버튼 글자·이름표·타이머 글자가 바탕과 4.5:1 이상이다', () => {
    const felt = block('BLOSSOM').match(/--felt-bg:[^;]*?(#[0-9a-f]{6}),\s*(#[0-9a-f]{6})\)/) ?? [];
    expect(felt).toHaveLength(3);
    [felt[1], felt[2]].forEach((background) => {
      expect(contrast(hex('BLOSSOM', '--felt-ink'), background)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(hex('BLOSSOM', '--felt-ink-muted'), background)).toBeGreaterThanOrEqual(4.5);
    });
    expect(contrast(hex('BLOSSOM', '--accent-text'), hex('BLOSSOM', '--accent'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(hex('BLOSSOM', '--accent-text'), hex('BLOSSOM', '--accent-hover'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(hex('BLOSSOM', '--plate-text'), hex('BLOSSOM', '--plate-bg'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(hex('BLOSSOM', '--timer-ink'), hex('BLOSSOM', '--timer-bg'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(hex('BLOSSOM', '--turn-tag-ink'), hex('BLOSSOM', '--turn-tag-bg'))).toBeGreaterThanOrEqual(4.5);
  });
});
