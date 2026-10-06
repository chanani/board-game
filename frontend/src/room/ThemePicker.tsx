import type { RoomTheme } from '../api/types';
import { ROOM_THEMES } from './roomTheme';

type Props = { value: RoomTheme; onChange: (theme: RoomTheme) => void };

/** 방 테마 미리보기 타일 5개. 타일마다 data-theme를 달아 방 화면과 같은 변수로 배경·테이블·카드 뒷면을 그린다. */
export function ThemePicker({ value, onChange }: Props) {
  return (
    <div>
      <span id="themeLabel" className="text-sm font-semibold text-wood-700">테마</span>
      <div role="radiogroup" aria-labelledby="themeLabel" className="mt-1 grid grid-cols-5 gap-1.5 sm:gap-2">
        {ROOM_THEMES.map((theme) => {
          const selected = value === theme.value;
          return (
            <button key={theme.value} type="button" role="radio" aria-checked={selected} onClick={() => onChange(theme.value)}
              className={`press-3d flex min-w-0 flex-col items-center gap-1 rounded-xl p-1 text-[11px] font-bold leading-tight break-keep outline-none focus-visible:ring-2 focus-visible:ring-mustard-300 ${
                selected ? 'bg-mustard-300/70 text-wood-800 ring-2 ring-mustard-400' : 'text-wood-700 hover:bg-cream-200/60'}`}>
              <span aria-hidden="true" data-theme={theme.value} className="room-scene relative block aspect-[4/3] w-full rounded-lg shadow-[0_2px_0_rgb(0_0_0/0.18)]">
                <span className="absolute inset-x-[16%] bottom-[14%] top-[34%] z-[1] flex items-center justify-center rounded-[46%/40%]"
                  style={{ background: 'var(--felt-bg)', boxShadow: '0 0 0 2px var(--rim-1), 0 0 0 3px var(--rim-2), 0 3px 4px var(--table-shadow)' }}>
                  <span className="block h-[62%] aspect-[5/7] rounded-[2px]"
                    style={{ background: 'repeating-linear-gradient(calc(90deg - var(--back-angle)), var(--back-a) 0 2px, var(--back-b) 2px 4px)', border: '1.5px solid var(--back-frame)' }} />
                </span>
              </span>
              <span className="text-center">{theme.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
