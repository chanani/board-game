import { useId, useRef, type KeyboardEvent } from 'react';

export const SEAT_OPTIONS = [2, 3, 4, 5];
const STEP: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
export const SECTION_TITLE = 'text-xs font-extrabold text-wood-700';

/** 게임의 최소~최대 인원으로 고를 수 있는 칸을 만든다. */
export function seatOptions(minPlayers: number, maxPlayers: number): number[] {
  return Array.from({ length: maxPlayers - minPlayers + 1 }, (_, index) => minPlayers + index);
}

type Props = {
  value: number;
  onChange: (count: number) => void;
  /** 이보다 작은 칸은 고를 수 없다(방에 이미 있는 인원). */
  min?: number;
  /** 보여 줄 인원 칸(게임의 최소~최대). */
  options?: number[];
};

/** 최대 인원 2~5 버튼 묶음. 라디오 그룹 관례대로 선택된 칸만 Tab으로 들어가고 화살표로 옮기면 바로 고른다. 비활성 칸은 건너뛴다. */
export function SeatPicker({ value, onChange, min = 2, options = SEAT_OPTIONS }: Props) {
  const labelId = useId();
  const seats = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = STEP[event.key];
    if (step === undefined) {
      return;
    }
    event.preventDefault();
    const enabled = options.filter((count) => count >= min);
    const next = enabled[(enabled.indexOf(value) + step + enabled.length) % enabled.length];
    onChange(next);
    seats.current[options.indexOf(next)]?.focus();
  };

  return (
    <div className="space-y-1.5">
      <span id={labelId} className={`block ${SECTION_TITLE}`}>최대 인원</span>
      <div role="radiogroup" aria-labelledby={labelId} onKeyDown={handleKey} className="grid grid-cols-4 gap-1.5">
        {options.map((count, index) => {
          const selected = value === count;
          return (
            <button key={count} ref={(node) => { seats.current[index] = node; }} type="button" role="radio" aria-checked={selected}
              disabled={count < min} tabIndex={selected ? 0 : -1} onClick={() => onChange(count)}
              className={`press-3d rounded-[10px] border py-2.5 text-sm font-extrabold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-mustard-300 disabled:cursor-not-allowed disabled:line-through disabled:opacity-40 ${
                selected ? 'border-mustard-600 bg-mustard-400 text-wood-800' : 'border-cream-200 bg-cream text-wood-700 hover:bg-cream-200/60'}`}>
              {count}
            </button>
          );
        })}
      </div>
    </div>
  );
}
