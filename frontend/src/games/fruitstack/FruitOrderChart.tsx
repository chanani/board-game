import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRightIcon, CloseIcon } from '../../components/icons';
import { FRUITS, MAX_LEVEL } from './engine/constants';
import { FruitIcon } from './FruitIcon';

export type ChartButtonShape = 'pill' | 'compact' | 'rail';

type Props = {
  /** 점수 띠의 모양을 따른다. pill: 높이 44 한 줄, compact: 높이 28 한 줄, rail: 폭 64 세로 띠. */
  shape?: ChartButtonShape;
  /** 게임 끝 연출처럼 테이블이 잠긴 동안: 열려 있던 순서표를 닫는다. */
  locked?: boolean;
};

/** 버튼과 순서표 사이, 순서표와 화면 가장자리 사이 간격(px). */
const GAP = 8;
const EDGE = 8;
/** 순서표 안의 과일 그림 크기: 체리 20px에서 수박 44px까지 고르게 커진다. */
const ICON_MIN = 20;
const ICON_MAX = 44;
const iconSize = (level: number) => Math.round(ICON_MIN + ((level - 1) * (ICON_MAX - ICON_MIN)) / (MAX_LEVEL - 1));

const BUTTON: Record<ChartButtonShape, string> = {
  pill: 'h-8 gap-1 rounded-full px-2 text-xs',
  compact: 'h-6 gap-1 rounded-full px-1.5 text-[10px]',
  rail: 'flex-col gap-0.5 rounded-xl px-1.5 py-1 text-[10px]',
};
/** 버튼 그림: 체리 → 귤 → 수박이 점점 커진다. */
const BUTTON_FRUITS: Record<ChartButtonShape, [number, number][]> = {
  pill: [[1, 10], [4, 14], [11, 18]],
  compact: [[1, 8], [4, 11], [11, 14]],
  rail: [[1, 10], [4, 14], [11, 18]],
};

type Spot = { top: number; left: number };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

/** 순서표의 자리: 버튼 바로 아래, 버튼과 가운데를 맞춘다. 화면 밖으로 넘치면 넘치지 않는 데까지 당긴다. */
function usePanelSpot(open: boolean, buttonRef: RefObject<HTMLElement | null>, panelRef: RefObject<HTMLElement | null>): Spot {
  const [spot, setSpot] = useState<Spot>({ top: EDGE, left: EDGE });
  useLayoutEffect(() => {
    if (!open) {
      return undefined;
    }
    const place = () => {
      const button = buttonRef.current?.getBoundingClientRect();
      const width = panelRef.current?.offsetWidth ?? 0;
      const height = panelRef.current?.offsetHeight ?? 0;
      const center = button ? button.left + button.width / 2 : window.innerWidth / 2;
      setSpot({
        top: clamp((button?.bottom ?? 0) + GAP, EDGE, window.innerHeight - height - EDGE),
        left: clamp(center - width / 2, EDGE, window.innerWidth - width - EDGE),
      });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open, buttonRef, panelRef]);
  return spot;
}

/** 순서표나 여는 버튼 밖을 누르거나 Esc를 누르면 닫는다. 판을 누르는 그 누름은 막지 않으므로 끌기가 그대로 시작된다. */
function useDismiss(open: boolean, inside: RefObject<HTMLElement | null>[], close: () => void): void {
  const insideRef = useRef(inside);
  insideRef.current = inside;
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!insideRef.current.some((ref) => ref.current?.contains(target))) {
        closeRef.current();
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeRef.current();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
}

function Chart({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-black">과일 순서</h2>
        <button type="button" aria-label="닫기" onClick={onClose} className="-mr-1 rounded-full p-1 text-stone-500 hover:bg-cream-200 hover:text-wood-800">
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>
      <p className="mt-0.5 text-xs font-semibold break-keep text-wood-700">같은 과일 둘이 닿으면 다음 과일로 합쳐져요. 화살표를 따라 갈수록 커져요.</p>
      <ol aria-label="작은 과일부터 큰 과일까지" className="mt-2 grid grid-cols-6 gap-y-1.5">
        {FRUITS.map((fruit) => (
          <li key={fruit.level} data-testid="chart-fruit" className="relative flex flex-col items-center gap-0.5">
            <span className="flex h-11 items-center"><FruitIcon level={fruit.level} size={iconSize(fruit.level)} /></span>
            <span className="text-[11px] font-bold leading-tight tracking-tight whitespace-nowrap">{fruit.name}</span>
            {fruit.level < MAX_LEVEL ? <ChevronRightIcon className="absolute -right-1.5 top-4 h-3 w-3 text-wood-500" /> : null}
          </li>
        ))}
      </ol>
      <p className="mt-2 text-[11px] font-semibold break-keep text-stone-500">수박 둘이 닿으면 함께 사라져요.</p>
    </>
  );
}

/**
 * 점수 띠의 "순서" 버튼과, 누르면 그 아래에 뜨는 과일 순서표(체리 → 수박).
 * 화면을 막지 않는 작은 창이라 경기는 그대로 흐르고, 판을 누르면 곧바로 닫혀 끄는 동안 판을 가리지 않는다.
 */
export function FruitOrderChart({ shape = 'pill', locked = false }: Props) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  if (locked && open) {
    setOpen(false);
  }
  const spot = usePanelSpot(open, buttonRef, panelRef);
  useDismiss(open, [buttonRef, panelRef], () => setOpen(false));

  return (
    <>
      <button ref={buttonRef} type="button" data-testid="fruit-chart-button" aria-label="과일 순서 보기" aria-haspopup="dialog" aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex shrink-0 items-center bg-white/15 font-bold outline-none hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-mustard-300 ${BUTTON[shape]}`}>
        <span aria-hidden="true" className="inline-flex items-end">
          {BUTTON_FRUITS[shape].map(([level, size]) => <FruitIcon key={level} level={level} size={size} className="-ml-0.5 first:ml-0" />)}
        </span>
        <span className={shape === 'pill' ? 'max-[419px]:sr-only' : undefined}>순서</span>
      </button>
      {open ? createPortal(
        <div ref={panelRef} role="dialog" aria-label="과일 순서" data-testid="fruit-chart"
          className="pop-in fixed z-30 overflow-y-auto rounded-2xl bg-cream-50 p-3 text-wood-800 shadow-[0_4px_0_var(--color-cream-300),0_12px_24px_rgb(0_0_0/0.35)]"
          style={{ ...spot, width: `min(27rem, calc(100vw - ${EDGE * 2}px))`, maxHeight: `calc(100dvh - ${EDGE * 2}px)` }}>
          <Chart onClose={() => setOpen(false)} />
        </div>,
        document.body,
      ) : null}
    </>
  );
}
