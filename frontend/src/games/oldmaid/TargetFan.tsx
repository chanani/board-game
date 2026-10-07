import { useRef } from 'react';
import type { TableLayout } from '../../lib/useTableLayout';
import { EDGE_FADE, FAN_RADIUS, fanAngle, fanDrop, fanSpacing, fixedFanRoom } from '../../table/fan';
import { useElementWidth } from '../../table/useElementWidth';
import { LIFT_RATIO } from './layout';
import { PlayingCardFace } from './PlayingCardFace';

type Props = {
  ownerName: string;
  count: number;
  cardWidth: number;
  minVisible: number;
  liftIndex: number | null;
  layout: TableLayout;
};

/** 뽑히는 상대의 손패를 가운데에 크게 펼친 뒷면 부채(D17: 모두에게 보인다). */
export function TargetFan({ ownerName, count, cardWidth, minVisible, liftIndex, layout }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(boxRef);
  const radius = FAN_RADIUS[layout];
  const edgeAngle = Math.abs(fanAngle(0, count));
  const angles = Array.from({ length: count }, (_, index) => fanAngle(index, count));
  const lift = cardWidth * 1.5 * LIFT_RATIO;
  // 가장자리 카드가 기울어 옆·아래로 삐져나오고 들린 카드가 위로 올라가도 잘리지 않게 여백을 두고, 장수가 줄어도 높이가 출렁이지 않게 최대 각도로 잰다.
  const { headroom: top, room } = fixedFanRoom(cardWidth, radius, lift);
  const { step, scroll, inset } = fanSpacing(count, width, cardWidth, minVisible, edgeAngle);
  const innerWidth = count === 0 ? 0 : (count - 1) * step + cardWidth + inset * 2;
  return (
    <div ref={boxRef} role="group" aria-label={`${ownerName}님의 카드 ${count}장`} data-testid="target-fan" data-oldmaid-zone="target"
      className={`w-full min-w-0 ${scroll ? 'overflow-x-auto' : 'overflow-x-clip'}`}
      style={scroll ? { maskImage: EDGE_FADE, WebkitMaskImage: EDGE_FADE } : undefined}>
      <div className="relative" style={{ width: innerWidth, height: top + cardWidth * 1.5 + room, margin: scroll ? undefined : '0 auto' }}>
        {angles.map((angle, index) => {
          const lifted = index === liftIndex;
          return (
            <span key={index} data-testid="target-card" data-index={index} data-lifted={lifted ? 'true' : undefined} aria-hidden="true"
              className="absolute transition-transform duration-150 motion-reduce:transition-none"
              style={{ left: inset + index * step, top, zIndex: index, transform: `translateY(${fanDrop(cardWidth, angle, radius) - (lifted ? lift : 0)}px) rotate(${angle}deg)` }}>
              <PlayingCardFace card={null} width={cardWidth} decorative className={lifted ? 'rounded-lg ring-4 ring-(--accent)' : undefined} />
            </span>
          );
        })}
      </div>
    </div>
  );
}
