import type { ReactNode } from 'react';

/**
 * 펠트 바깥의 나무 테두리는 box-shadow(13px)라서 레이아웃 크기에 잡히지 않는다.
 * 펠트를 여러 개 나란히 둘 때는 이 격자를 써서 테두리끼리 붙거나 상자 밖으로 삐져나오지 않게 한다 (보이는 간격 18px).
 */
export const FELT_GRID = 'grid gap-11 p-[13px]';

type Props = { children: ReactNode; className?: string; shape?: 'oval' | 'rect' | 'round' };

const RADIUS = { oval: 'rounded-[48%/40%]', rect: 'rounded-[28px]', round: 'rounded-full' };

export function Felt({ children, className = '', shape = 'rect' }: Props) {
  const radius = RADIUS[shape];
  return <div className={`felt relative ${radius} ${className}`}>{children}</div>;
}
