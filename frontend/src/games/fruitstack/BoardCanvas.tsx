import { memo, useEffect, useRef } from 'react';
import { createCanvasPainter } from './canvasPainter';
import { BOARD_W, type BoardFrame } from './engine/constants';
import { paintBoard, type MergeEffect } from './paint';

export type BoardCanvasProps = {
  /** CSS px. 높이 = width × 1.5, 배율 = width ÷ 360. */
  width: number;
  /** 프레임마다 부른다(ref에서 읽는다). */
  getFrame: () => BoardFrame | null;
  mine?: boolean;
  dimmed?: boolean;
  /** 작은 판: 두 프레임에 한 번. */
  everyOtherFrame?: boolean;
  getEffects?: () => MergeEffect[];
  getAutoDropLeftMs?: () => number | null;
  label: string;
  role?: 'img' | 'application';
};

const MAX_RATIO = 2;

// jsdom에는 캔버스가 없다(getContext가 "Not implemented"를 찍거나 던진다). 그러면 그리지 않는다.
function contextOf(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  try {
    return canvas.getContext('2d') ?? null;
  } catch {
    return null;
  }
}

/** 판 한 장을 그리는 캔버스. 판 상태는 React 밖(ref)에 있고 rAF에서 직접 그린다. */
export const BoardCanvas = memo(function BoardCanvas(props: BoardCanvasProps) {
  const { width, label, role } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // 함수 props·표시 옵션은 바뀌어도 고리를 다시 만들지 않고 최신 것을 읽는다.
  const latest = useRef(props);
  latest.current = props;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0) {
      return undefined;
    }
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_RATIO);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(width * 1.5 * ratio);
    const context = contextOf(canvas);
    if (!context) {
      return undefined;
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const painter = createCanvasPainter(context, ratio);
    let frameCount = 0;
    let handle = 0;
    const loop = () => {
      handle = window.requestAnimationFrame(loop);
      const { getFrame, mine, dimmed, everyOtherFrame, getEffects, getAutoDropLeftMs } = latest.current;
      frameCount += 1;
      if (everyOtherFrame && frameCount % 2 === 1) {
        return;
      }
      paintBoard(painter, getFrame(), {
        scale: width / BOARD_W, mine: mine ?? false, dimmed: dimmed ?? false,
        effects: getEffects?.() ?? [], autoDropLeftMs: getAutoDropLeftMs?.() ?? null,
      });
    };
    handle = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(handle);
  }, [width]);

  return <canvas ref={canvasRef} role={role ?? 'img'} aria-label={label} className="block" style={{ width, height: width * 1.5 }} />;
});
