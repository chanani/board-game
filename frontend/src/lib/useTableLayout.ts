import { PC_QUERY, useMediaQuery } from './useMediaQuery';

/** 휴대폰을 눕힌 화면: 높이가 낮은 가로 화면. */
export const LANDSCAPE_PHONE_QUERY = '(orientation: landscape) and (max-height: 540px)';
/** 태블릿처럼 세로라도 폭이 넉넉한 화면. */
export const TABLET_QUERY = '(min-width: 640px)';

/**
 * 게임 테이블 배치.
 * pc: 큰 둥근 테이블. landscape: 휴대폰을 눕힌 화면, 줄인 둥근 테이블 + 왼쪽 정보 칸.
 * tablet: 줄인 둥근 테이블. portrait: 세로 휴대폰, 가장 작은 둥근 테이블.
 */
export type TableLayout = 'pc' | 'landscape' | 'tablet' | 'portrait';

export function useTableLayout(): TableLayout {
  const pc = useMediaQuery(PC_QUERY);
  const landscape = useMediaQuery(LANDSCAPE_PHONE_QUERY);
  const tablet = useMediaQuery(TABLET_QUERY);
  if (pc) {
    return 'pc';
  }
  if (landscape) {
    return 'landscape';
  }
  return tablet ? 'tablet' : 'portrait';
}
