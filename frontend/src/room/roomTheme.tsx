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
  { value: 'BEACH', name: '열대 해변', dot: '#0ea5e9' },
];

export const DEFAULT_ROOM_THEME: RoomTheme = 'WOOD';

export function roomThemeOf(theme: RoomTheme | undefined) {
  return ROOM_THEMES.find((item) => item.value === theme) ?? ROOM_THEMES[0];
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
export function ThemeBadge({ theme }: { theme: RoomTheme | undefined }) {
  const info = roomThemeOf(theme);
  return (
    <span className="inline-flex items-center gap-1">
      <span data-testid="theme-dot" aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-black/20" style={{ backgroundColor: info.dot }} />
      {info.name}
    </span>
  );
}
