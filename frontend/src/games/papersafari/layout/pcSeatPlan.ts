import type { SeatSize } from './Seat';

/**
 * PC 테이블에서 상대 판을 어떻게 앉힐지.
 * arc: 상대는 모두 맞은편 한 줄(양옆 자리는 lowered만큼 아래로), 덱·내 판·내 옆 칸은 아래 한 줄.
 * round: 위 줄 · 가운데 줄(왼쪽 상대, 덱, 오른쪽 상대) · 내 줄. 내 판이 없는 관전자만 쓴다.
 */
export type PcSeatPlan = {
  arrangement: 'arc' | 'round';
  opponent: SeatSize;
  /** 들고 있는 카드를 판 옆이 아니라 판 위에 겹쳐 자리 폭을 판 폭으로 줄인다. */
  handOverlay: boolean;
  /** arc에서 양 끝(왼쪽·오른쪽) 자리를 내리는 위 여백. 타원 모서리 밖으로 판이 나가지 않게 한다. */
  lowered: string;
  /** 상대 줄의 자리 사이 간격. */
  gap: string;
};

const ROUND: PcSeatPlan = { arrangement: 'round', opponent: 'sm', handOverlay: false, lowered: '', gap: 'gap-12' };

/**
 * 1280x860 PC 화면은 상태 바·차례 안내 아래 테이블에 약 590px 높이만 남는다.
 * 내 판(lg, 278px)과 상대 판(sm, 208px)에 덱 줄까지 세로로 쌓으면 넘치므로, 내 자리가 있으면 덱을 내 판 옆에 두고
 * 상대를 한 줄에 앉힌다. 한 줄에 셋이면 손 카드를 판 위에 겹치고, 넷이면 판을 한 단계(xs) 줄여 펠트 폭 안에 넣는다.
 * 관전자는 내 판이 없어 기존 둥근 배치로도 들어간다.
 */
export function pcSeatPlan(opponentCount: number, seated: boolean): PcSeatPlan {
  if (!seated) {
    return ROUND;
  }
  if (opponentCount <= 2) {
    return { arrangement: 'arc', opponent: 'sm', handOverlay: false, lowered: '', gap: 'gap-12' };
  }
  if (opponentCount === 3) {
    return { arrangement: 'arc', opponent: 'sm', handOverlay: true, lowered: 'pt-10', gap: 'gap-6' };
  }
  return { arrangement: 'arc', opponent: 'xs', handOverlay: true, lowered: 'pt-12', gap: 'gap-4' };
}
