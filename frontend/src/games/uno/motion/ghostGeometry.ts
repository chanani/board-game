export type Rect = { x: number; y: number; width: number; height: number };

/** 날아가는 카드 한 장의 상자와 이동량. 구역(손패 전체 등) 크기가 아니라 고정 카드 크기를 쓰고, 두 구역의 중심끼리 잇는다. */
export function ghostBox(from: Rect, to: Rect, cardWidth: number) {
  const height = cardWidth * 1.5;
  const fromX = from.x + from.width / 2;
  const fromY = from.y + from.height / 2;
  return {
    left: fromX - cardWidth / 2,
    top: fromY - height / 2,
    width: cardWidth,
    height,
    dx: to.x + to.width / 2 - fromX,
    dy: to.y + to.height / 2 - fromY,
  };
}
