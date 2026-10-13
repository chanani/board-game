import { useLayoutEffect, useState } from 'react';
import type { TableLayout } from '../../lib/useTableLayout';

export type Box = { w: number; h: number };

/** 잴 수 없을 때(jsdom, 첫 렌더) 쓰는 배치별 기본 상자. */
const DEFAULT_BOX: Record<TableLayout, Box> = { pc: { w: 844, h: 660 }, portrait: { w: 342, h: 584 }, landscape: { w: 632, h: 326 } };
/** 판 아래에 남기는 높이. 휴대폰은 페이지 아래 여백(4px)만 남긴다. */
const BOTTOM_MARGIN: Record<TableLayout, number> = { pc: 24, portrait: 4, landscape: 4 };
/** 화면이 아주 낮아도 판이 사라지지 않게 하는 가장 낮은 상자 높이(그때는 페이지가 조금 스크롤된다). */
const MIN_HEIGHT = 240;

/**
 * 테이블 몸통이 쓸 수 있는 상자(스펙 6.4): 폭은 ref를 단 요소의 폭, 높이는 (스크롤하지 않은) 화면 아래까지 남은 높이.
 * inset은 몸통 아래쪽에 더 비워 둘 높이(바닥 판의 안쪽 여백). 게임이 끝났다 다시 시작해 요소가 바뀌어도 다시 잰다.
 * 요소 크기는 그대로인데 위치만 바뀌는 일(머리줄이 숨음, 연결 끊김 알림이 뜸)은 remeasureKey를 바꿔 알린다.
 */
export function useBoardBox(layout: TableLayout, inset = 0, remeasureKey = ''): { ref: (element: HTMLDivElement | null) => void; box: Box } {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [measured, setMeasured] = useState<Box | null>(null);

  useLayoutEffect(() => {
    if (!element) {
      setMeasured(null);
      return undefined;
    }
    const measure = () => {
      const w = element.clientWidth;
      // 페이지 맨 위에서 잰 위치를 쓴다. 화면 위쪽 위치를 그대로 쓰면 스크롤된 만큼 상자가 커져 판이 화면보다 커진다.
      const top = element.getBoundingClientRect().top + (window.scrollY || 0);
      const room = window.innerHeight - top - BOTTOM_MARGIN[layout] - inset;
      if (w <= 0 || room <= 0) {
        setMeasured(null);
        return;
      }
      const h = Math.max(MIN_HEIGHT, Math.floor(room));
      setMeasured((current) => (current && current.w === w && current.h === h ? current : { w, h }));
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(element);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [element, layout, inset, remeasureKey]);

  return { ref: setElement, box: measured ?? DEFAULT_BOX[layout] };
}
