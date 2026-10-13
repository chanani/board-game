import { useLayoutEffect } from 'react';

/**
 * 휴대폰에서 판이 화면을 가득 쓰는 게임(과일 쌓기)이 켠다. 켜져 있는 동안 html[data-game-focus]가 달려
 * 사이트 머리줄이 숨고 페이지 여백이 줄며, 페이지 높이가 지금 보이는 화면 높이(100dvh)를 넘지 않는다(index.css).
 * 판 크기를 재는 효과보다 먼저 불러야 줄어든 여백으로 잰다.
 */
export function useGameFocus(active: boolean): void {
  useLayoutEffect(() => {
    if (!active) {
      return undefined;
    }
    document.documentElement.dataset.gameFocus = 'on';
    return () => {
      delete document.documentElement.dataset.gameFocus;
    };
  }, [active]);
}
