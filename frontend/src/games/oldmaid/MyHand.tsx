import { motion } from 'motion/react';
import { useRef, useState } from 'react';
import type { PlayingCard } from '../../api/types';
import { ShuffleIcon } from '../../components/icons';
import type { TableLayout } from '../../lib/useTableLayout';
import { EDGE_FADE, FAN_RADIUS, fanAngle, fanDrop, fanOverhang, fanSpacing, fixedFanRoom } from '../../table/fan';
import { useElementWidth } from '../../table/useElementWidth';
import { useFreshIds } from '../../table/useFreshIds';
import { handMinVisible, LIFT_RATIO, shuffleSide, type OldMaidSizes } from './layout';
import { PlayingCardFace } from './PlayingCardFace';

type Props = {
  cards: PlayingCard[];
  /** 남이 내 카드를 고를 때 그 자리(null = 없음). */
  liftIndex: number | null;
  layout: TableLayout;
  sizes: OldMaidSizes;
  /** 날아가는 카드 연출이 찾는 칸 이름의 내 id. */
  zoneId: number;
  canShuffle: boolean;
  shuffleLocked: boolean;
  onShuffle: () => void;
};

const BOTTOM_GAP = 4;

/** 내 손패: 앞면 부채꼴, 서버 순서 그대로(D13). 섞으면 카드가 새 자리로 미끄러진다(layout 애니메이션). */
export function MyHand({ cards, liftIndex, layout, sizes, zoneId, canShuffle, shuffleLocked, onShuffle }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(boxRef);
  const shuffleRef = useRef<HTMLDivElement>(null);
  const shuffleWidth = useElementWidth(shuffleRef);
  const [scrollLeft, setScrollLeft] = useState(0);
  const fresh = useFreshIds(cards);
  const count = cards.length;
  const radius = FAN_RADIUS[layout];
  const edgeAngle = Math.abs(fanAngle(0, count));
  const lift = sizes.hand * 1.5 * LIFT_RATIO;
  const angles = cards.map((_, index) => fanAngle(index, count));
  // 줄 높이는 장수와 상관없이 고정한다(스펙 6.4): 위·아래 여백을 가장 크게 기울 수 있는 각도로 재고, 빈 손패도 같은 높이.
  const { headroom: top, room } = fixedFanRoom(sizes.hand, radius, lift);
  const rowHeight = top + sizes.hand * 1.5 + BOTTOM_GAP + room;
  const { step, scroll, inset } = fanSpacing(count, width, sizes.hand, handMinVisible(sizes), edgeAngle);
  const innerWidth = count === 0 ? 0 : (count - 1) * step + sizes.hand + inset * 2;
  // 들린 카드가 손패 칸 안에서 차지하는 가로 범위(가운데 맞춤 또는 스크롤 위치 반영, 기울어 삐져나온 폭 포함).
  const offset = scroll ? -scrollLeft : Math.max(0, (width - innerWidth) / 2);
  const lifted = liftIndex === null || liftIndex >= count ? null : liftedSpan(offset + inset + liftIndex * step, sizes.hand, angles[liftIndex]);
  const side = shuffleSide(lifted, width, shuffleWidth);
  const shuffle = canShuffle ? (
    <button type="button" data-no-click-sound aria-label="내 손패 섞기" disabled={shuffleLocked} onClick={onShuffle}
      className="press-3d inline-flex items-center gap-1 rounded-full bg-cream-50 px-3 py-1 text-xs font-bold text-wood-800 shadow-[0_3px_0_var(--color-cream-300)] disabled:opacity-50">
      <ShuffleIcon className="h-3.5 w-3.5" />섞기
    </button>
  ) : null;
  if (count === 0) {
    return (
      <div data-testid="hand-empty" className="flex items-center justify-center" style={{ height: rowHeight }}>
        <p className="felt-ink text-center text-sm font-bold">손패를 모두 비웠어요</p>
      </div>
    );
  }
  return (
    // 섞기 버튼은 따로 줄을 두지 않고 손패 칸 위 여백에 띄워 높이를 아낀다(눕힌 휴대폰 한 화면). 들린 카드를 가리면 반대쪽으로 옮긴다.
    <div className="relative">
      <div ref={shuffleRef} data-testid="shuffle-slot" data-side={side} className={`absolute top-0 z-20 ${side === 'left' ? 'left-0' : 'right-0'}`}>{shuffle}</div>
      <div ref={boxRef} role="group" aria-label={`내 카드 ${count}장`} data-testid="my-hand" data-oldmaid-zone={`hand:${zoneId}`}
        className={scroll ? 'overflow-x-auto' : 'overflow-x-clip'} style={scroll ? { maskImage: EDGE_FADE, WebkitMaskImage: EDGE_FADE } : undefined}
        onScroll={scroll ? (event) => setScrollLeft(event.currentTarget.scrollLeft) : undefined}>
        <div data-testid="my-hand-row" className="relative" style={{ width: innerWidth, height: rowHeight, margin: scroll ? undefined : '0 auto' }}>
          {cards.map((card, index) => {
            const lifted = index === liftIndex;
            const angle = angles[index];
            return (
              // 바깥(motion layout)은 자리만 옮기고(섞으면 미끄러짐), 기울기·들림은 안쪽 div가 맡는다(layout 애니메이션이 transform을 덮어쓰지 않게).
              <motion.div key={card.id} layout data-testid="my-card" data-card-id={card.id} data-lifted={lifted ? 'true' : undefined}
                data-fresh={fresh.has(card.id) ? 'true' : undefined} transition={{ duration: 0.35 }}
                className="absolute" style={{ left: inset + index * step, top, zIndex: index }}>
                <div className={`rounded-lg transition-transform duration-150 motion-reduce:transition-none ${fresh.has(card.id) ? 'ring-4 ring-yellow-300' : ''} ${lifted ? 'ring-4 ring-(--accent)' : ''}`}
                  style={{ transform: `translateY(${fanDrop(sizes.hand, angle, radius) - (lifted ? lift : 0)}px) rotate(${angle}deg)` }}>
                  <PlayingCardFace card={card} width={sizes.hand} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** 왼쪽 끝이 left인 카드(폭 width)가 angle도 기울었을 때 차지하는 가로 범위. */
function liftedSpan(left: number, width: number, angle: number): { left: number; right: number } {
  const over = fanOverhang(width, angle);
  return { left: left - over, right: left + width + over };
}
