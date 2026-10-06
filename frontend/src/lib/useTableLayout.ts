import { useMediaQuery } from './useMediaQuery';

/** 휴대폰을 눕힌 화면: 높이가 낮은 가로 화면. */
export const LANDSCAPE_PHONE_QUERY = '(orientation: landscape) and (max-height: 540px)';
/** PC와 같은 큰 테이블을 쓰는 화면(태블릿 포함). 높이도 보아, 폭이 넓은 눕힌 휴대폰은 빠진다. */
export const TABLE_PC_QUERY = '(min-width: 768px) and (min-height: 541px)';

/**
 * 게임 테이블 배치.
 * pc: 큰 둥근 테이블(PC·태블릿). landscape: 휴대폰을 눕힌 화면, 왼쪽 정보 칸 + 낮은 테이블.
 * portrait: 세로 휴대폰(폭 768 미만), 가장 작은 둥근 테이블.
 */
export type TableLayout = 'pc' | 'landscape' | 'portrait';

export function useTableLayout(): TableLayout {
  const pc = useMediaQuery(TABLE_PC_QUERY);
  const landscape = useMediaQuery(LANDSCAPE_PHONE_QUERY);
  if (pc) {
    return 'pc';
  }
  return landscape ? 'landscape' : 'portrait';
}
