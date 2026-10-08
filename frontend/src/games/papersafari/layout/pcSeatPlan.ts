import type { SeatRows } from '../../../table/seats';
import type { PileSize } from './CenterPiles';
import type { SeatSize } from './Seat';

/**
 * PC 테이블에서 자리를 어떻게 앉힐지.
 * ring: 가운데 칸(위 상대 줄, 그 아래 덱·버린 카드) 양옆에 왼쪽·오른쪽 상대, 맨 아래 내 판. 덱이 상대와 내 판 사이 테이블 가운데에 온다.
 * round: 위 줄 · 가운데 줄(왼쪽 상대, 덱, 오른쪽 상대) · 내 줄. 내 판이 없는 관전자만 쓴다.
 */
export type PcSeatPlan = {
  arrangement: 'ring' | 'round';
  opponent: SeatSize;
  me: SeatSize;
  piles: PileSize;
  /** 들고 있는 카드를 판 옆이 아니라 판 위에 겹쳐 자리 폭을 판 폭으로 줄인다. */
  handOverlay: boolean;
};

const ROUND: PcSeatPlan = { arrangement: 'round', opponent: 'sm', me: 'lg', piles: 'md', handOverlay: false };

/**
 * 1280x860 PC 화면은 상태 바·차례 안내 아래 펠트 안쪽에 약 545px 높이만 남는다.
 * 상대가 양옆에만 앉으면(3인) 덱이 그 사이에 들어가 보통 크기(상대 sm 208px, 내 판 lg 278px)로 들어간다.
 * 가운데 칸에 위 상대가 있으면 위 상대(xs 184px) · 덱(sm 93px) · 내 판(md 234px)을 세로로 쌓아야 해서 한 단계씩 줄인다.
 * 관전자는 내 판이 없어 기존 둥근 배치로도 들어간다.
 */
export function pcSeatPlan(opponentCount: number, seated: boolean): PcSeatPlan {
  if (!seated) {
    return ROUND;
  }
  if (opponentCount === 2) {
    return { arrangement: 'ring', opponent: 'sm', me: 'lg', piles: 'md', handOverlay: false };
  }
  return { arrangement: 'ring', opponent: 'xs', me: 'md', piles: 'sm', handOverlay: true };
}

/** ring 배치의 자리: 위 왼쪽·위 오른쪽 둘만 있으면(3인) 양옆으로 옮겨 덱을 가운데 두고 둘러앉게 한다. */
export function ringSeats(rows: SeatRows): SeatRows {
  if (rows.left !== null || rows.top.length !== 2) {
    return rows;
  }
  return { top: [], left: rows.top[0], right: rows.top[1] };
}
