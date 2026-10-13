import { createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import type { RoomTheme } from '../api/types';

/** 방 테마 5종. 색과 배경은 index.css의 [data-theme] 변수에 있고, 여기에는 이름과 목록용 색 점만 둔다. */
export const ROOM_THEMES: { value: RoomTheme; name: string; dot: string }[] = [
  { value: 'WOOD', name: '원목 라운지', dot: '#2f8a57' },
  { value: 'SUNSET', name: '사바나 노을', dot: '#ea580c' },
  { value: 'MOONLIT', name: '달빛 정글', dot: '#1e3a8a' },
  { value: 'AURORA', name: '설원 오로라', dot: '#7dd3fc' },
  { value: 'BLOSSOM', name: '벚꽃 언덕', dot: '#f48fb1' },
];

export const DEFAULT_ROOM_THEME: RoomTheme = 'WOOD';

/** 없어진 테마 값 → 그 자리를 이은 테마. 열대 해변(BEACH)은 벚꽃 언덕이 되었다. */
const RETIRED_THEMES: Record<string, RoomTheme> = { BEACH: 'BLOSSOM' };

/**
 * 서버가 준 테마 값을 지금 있는 테마로 맞춘다. 배포가 엇갈려 예전 값(BEACH)이나 모르는 값이 와도 화면이 깨지지 않게,
 * 없어진 테마는 그 자리를 이은 테마로, 모르는 값은 기본(원목)으로 본다.
 */
export function resolveRoomTheme(theme: string | null | undefined): RoomTheme {
  const known = RETIRED_THEMES[theme ?? ''] ?? theme;
  return ROOM_THEMES.find((item) => item.value === known)?.value ?? DEFAULT_ROOM_THEME;
}

export function roomThemeOf(theme: string | null | undefined) {
  const resolved = resolveRoomTheme(theme);
  return ROOM_THEMES.find((item) => item.value === resolved) ?? ROOM_THEMES[0];
}

const RoomThemeContext = createContext<RoomTheme>(DEFAULT_ROOM_THEME);

export const RoomThemeProvider = RoomThemeContext.Provider;

/** body로 빼낸 요소(카드 이동 그림자 등)도 방 테마를 따르도록 data-theme 값을 알려준다. */
export function useRoomTheme(): RoomTheme {
  return useContext(RoomThemeContext);
}

/** 방 화면 전체 배경(하늘·노을·눈밭 등). 방 화면에만 그려지고 방을 떠나면 함께 사라진다. 테마가 바뀌면 부드럽게 갈아 낀다. */
export function RoomBackdrop({ theme }: { theme: RoomTheme }) {
  return createPortal(
    <AnimatePresence initial={false}>
      <motion.div key={theme} data-testid="room-backdrop" data-theme={theme} aria-hidden="true"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
        className="room-scene pointer-events-none fixed inset-0 -z-10" />
    </AnimatePresence>,
    document.body,
  );
}

/** 목록에 쓰는 테마 색 점 + 이름. */
export function ThemeBadge({ theme }: { theme: string | undefined }) {
  const info = roomThemeOf(theme);
  return (
    <span className="inline-flex items-center gap-1">
      <span data-testid="theme-dot" aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-black/20" style={{ backgroundColor: info.dot }} />
      {info.name}
    </span>
  );
}
