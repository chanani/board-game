import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ROOM_THEMES, ThemeBadge, resolveRoomTheme, roomThemeOf } from './roomTheme';

describe('방 테마 목록', () => {
  it('다섯 가지이고 마지막은 벚꽃 언덕이다(열대 해변은 없다)', () => {
    expect(ROOM_THEMES.map((theme) => theme.value)).toEqual(['WOOD', 'SUNSET', 'MOONLIT', 'AURORA', 'BLOSSOM']);
    expect(ROOM_THEMES.map((theme) => theme.name)).toEqual(['원목 라운지', '사바나 노을', '달빛 정글', '설원 오로라', '벚꽃 언덕']);
  });
});

describe('resolveRoomTheme', () => {
  it('지금 있는 테마는 그대로다', () => {
    ROOM_THEMES.forEach((theme) => expect(resolveRoomTheme(theme.value)).toBe(theme.value));
  });

  it('없어진 열대 해변(BEACH)은 그 자리를 이은 벚꽃 언덕으로 본다', () => {
    expect(resolveRoomTheme('BEACH')).toBe('BLOSSOM');
    expect(roomThemeOf('BEACH').name).toBe('벚꽃 언덕');
  });

  it('모르는 값이나 빈 값은 원목 라운지다', () => {
    expect(resolveRoomTheme('NEON')).toBe('WOOD');
    expect(resolveRoomTheme('')).toBe('WOOD');
    expect(resolveRoomTheme(undefined)).toBe('WOOD');
    expect(resolveRoomTheme(null)).toBe('WOOD');
    expect(resolveRoomTheme('toString')).toBe('WOOD');
  });
});

describe('ThemeBadge', () => {
  it('예전 값이 와도 벚꽃 언덕 이름과 색 점을 보인다', () => {
    render(<ThemeBadge theme="BEACH" />);

    expect(screen.getByText('벚꽃 언덕')).toBeInTheDocument();
    expect(screen.getByTestId('theme-dot')).toHaveStyle({ backgroundColor: '#f48fb1' });
  });
});
