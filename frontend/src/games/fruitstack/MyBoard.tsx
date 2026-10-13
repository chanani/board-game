import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { BoardCanvas } from './BoardCanvas';
import { BOARD_W, fruitName, radiusOf, type BoardFrame } from './engine/constants';
import type { MergeEffect } from './paint';
import { formatScore } from './texts';

type Props = {
  width: number;
  getFrame: () => BoardFrame | null;
  getEffects: () => MergeEffect[];
  getAutoDropLeftMs: () => number | null;
  score: number;
  held: number;
  out: boolean;
  catchingUp: boolean;
  interactive: boolean;
  onAim: (x: number) => void;
  onDrop: () => void;
};

const STEP = 12;
const BIG_STEP = 36;
const NOTICE = 'pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-2xl bg-black/70 text-center font-black text-white shadow-[0_4px_12px_rgb(0_0_0/0.4)]';

const isFinePointer = () => typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches;

/** 내 판: 끌어서 자리를 정하고 놓으면 떨어진다(스펙 6.5). 떨어뜨리기는 서버에 보내지 않으므로 보내기 잠금이 없다. */
export function MyBoard({ width, getFrame, getEffects, getAutoDropLeftMs, score, held, out, catchingUp, interactive, onAim, onDrop }: Props) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  // 누르는 중이면 그 누름으로 떨어뜨릴 수 있는지(누르는 순간 과일을 들고 있었는지), 아니면 null.
  const pressRef = useRef<{ canDrop: boolean } | null>(null);
  const aimRef = useRef(BOARD_W / 2);

  const aimAt = (x: number) => {
    const margin = held > 0 ? radiusOf(held) : 0;
    aimRef.current = Math.min(BOARD_W - margin, Math.max(margin, x));
    onAim(x);
  };
  const toBoardX = (clientX: number) => {
    const left = boxRef.current?.getBoundingClientRect().left ?? 0;
    return ((clientX - left) / width) * BOARD_W;
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!interactive) {
      return;
    }
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // 잡을 수 없는 포인터면 판 안에서만 따라간다.
    }
    pressRef.current = { canDrop: held > 0 };
    aimAt(toBoardX(event.clientX));
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (interactive && (pressRef.current || isFinePointer())) {
      aimAt(toBoardX(event.clientX));
    }
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const press = pressRef.current;
    pressRef.current = null;
    if (!interactive || !press?.canDrop) {
      return;
    }
    aimAt(toBoardX(event.clientX));
    onDrop();
  };
  const onPointerCancel = () => {
    pressRef.current = null;
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!interactive) {
      return;
    }
    const step = event.shiftKey ? BIG_STEP : STEP;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      aimAt(aimRef.current + (event.key === 'ArrowLeft' ? -step : step));
      return;
    }
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      onDrop();
    }
  };

  const label = `내 판. 점수 ${formatScore(score)}점, 들고 있는 과일 ${held > 0 ? fruitName(held) : '없음'}. 좌우 화살표로 자리를 정하고 스페이스로 떨어뜨려요`;
  return (
    <div ref={boxRef} data-testid="my-board" data-no-click-sound tabIndex={0}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} onKeyDown={onKeyDown}
      className={`relative select-none overflow-hidden rounded-xl outline-none ring-2 ring-white/25 focus-visible:ring-[3px] focus-visible:ring-mustard-300 ${interactive ? 'cursor-grab active:cursor-grabbing' : ''}`}
      style={{ width, height: width * 1.5, touchAction: 'none' }}>
      <BoardCanvas mine role="application" width={width} getFrame={getFrame} getEffects={getEffects} getAutoDropLeftMs={getAutoDropLeftMs} dimmed={out} label={label} />
      {catchingUp && !out ? <p role="status" className={`${NOTICE} px-4 py-1.5 text-sm`}>따라잡는 중…</p> : null}
      {out ? (
        <p role="status" className={`${NOTICE} px-5 py-3`}>
          <span className="block text-xl">가득 찼어요!</span>
          <span className="block text-base tabular-nums">{formatScore(score)}점</span>
        </p>
      ) : null}
    </div>
  );
}
