import { motion } from 'motion/react';
import { useRef } from 'react';
import type { PlayingCard } from '../../api/types';
import { PairIcon, ShuffleIcon } from '../../components/icons';
import type { TableLayout } from '../../lib/useTableLayout';
import { EDGE_FADE, FAN_RADIUS, fanAngle, fanDrop, fanSpacing, fixedFanRoom } from '../../table/fan';
import { useElementWidth } from '../../table/useElementWidth';
import { useFreshIds } from '../../table/useFreshIds';
import { cardName } from './cards';
import { handMinVisible, LIFT_RATIO, type OldMaidSizes } from './layout';
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
  /** 짝 고르기(R36 처음 버리기·R37 짝 버리기에서 내가 버릴 수 있을 때). 없으면 카드는 누를 수 없다. */
  picker?: HandPicker;
};

export type HandPicker = {
  /** 골라 둔 카드(0~1장). 같은 숫자 두 장째를 누르면 바로 버린다. */
  selectedIds: number[];
  /** 은은하게 빛낼 카드(짝 버리기 단계의 뽑은 짝). */
  glowIds: number[];
  /** 보낸 짝의 카드(화면이 바뀌기 전까지 누를 수 없다). */
  pendingIds: number[];
  onPick: (id: number) => void;
  /** 두 번째 카드가 다른 숫자일 때 잠깐 보이는 안내. */
  hint: string | null;
  /** 자동으로 버리기를 보낸 뒤 화면이 바뀌거나 오류가 오기 전까지 잠금. */
  locked: boolean;
  onDiscardAll: () => void;
};

const BOTTOM_GAP = 4;
/** 섞기 버튼 자리 높이(px). */
const SHUFFLE_SLOT_HEIGHT = 28;

/** 내 손패: 앞면 부채꼴, 서버 순서 그대로(D13). 섞으면 카드가 새 자리로 미끄러진다(layout 애니메이션). */
export function MyHand({ cards, liftIndex, layout, sizes, zoneId, canShuffle, shuffleLocked, onShuffle, picker }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(boxRef);
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
  const shuffle = canShuffle ? (
    <button type="button" data-no-click-sound aria-label="내 손패 섞기" disabled={shuffleLocked} onClick={onShuffle}
      className="press-3d inline-flex items-center gap-1 rounded-full bg-cream-50 px-3 py-1 text-xs font-bold text-wood-800 shadow-[0_3px_0_var(--color-cream-300)] disabled:opacity-50">
      <ShuffleIcon className="h-3.5 w-3.5" />섞기
    </button>
  ) : null;
  const beside = layout === 'landscape';
  // 자동으로 버리기 버튼은 섞기와 같은 칸에 둔다(새 줄을 만들어 배치 높이를 늘리지 않는다). 짝이 날아가는 소리(place)가 따로 나므로 클릭 소리는 끈다.
  const discard = picker ? (
    <>
      {picker.hint ? (
        <span data-testid="discard-hint" role="status"
          className={`felt-ink min-w-0 text-[11px] font-bold ${beside ? 'break-keep text-right leading-tight' : 'truncate'}`}>{picker.hint}</span>
      ) : null}
      <button type="button" data-no-click-sound data-testid="discard-all-button" disabled={picker.locked} onClick={picker.onDiscardAll}
        className={`press-3d inline-flex shrink-0 items-center gap-1 rounded-full bg-(--accent) py-1 font-extrabold text-(--accent-text) shadow-[0_3px_0_var(--accent-shadow)] disabled:opacity-50 ${beside ? 'break-keep px-2 text-center text-[11px] leading-tight' : 'whitespace-nowrap px-3 text-xs'}`}>
        {/* 눕힌 화면의 좁은 옆 칸(4.5rem)에서는 아이콘을 빼고 두 줄로 접는다. */}
        {beside ? null : <PairIcon className="h-3.5 w-3.5" />}자동으로 버리기
      </button>
    </>
  ) : null;
  // 섞기 버튼 자리는 늘 따로 남겨 둔다(PC·세로는 손패 위 줄, 눕힌 화면은 높이가 모자라 오른쪽 칸). 손패 위에 띄우면 남이 고르는
  // 들린 카드를 가리지 않으려고 좌우로 자꾸 옮겨 다녀 눈에 거슬렸다(Task 13 브라우저 확인). 섞을 수 없을 때도 자리는 남겨 높이가 그대로다.
  if (count === 0) {
    return (
      <div data-testid="hand-empty" className="flex items-center justify-center" style={{ height: rowHeight + (beside ? 0 : SHUFFLE_SLOT_HEIGHT) }}>
        <p className="felt-ink text-center text-sm font-bold">손패를 모두 비웠어요</p>
      </div>
    );
  }
  return (
    <div className={beside ? 'flex items-start gap-2' : undefined}>
      <div data-testid="shuffle-slot" data-placement={beside ? 'beside' : 'above'}
        className={`flex justify-end gap-1.5 ${beside ? 'order-last w-[4.5rem] shrink-0 flex-col items-end' : 'items-center'}`} style={beside ? undefined : { height: SHUFFLE_SLOT_HEIGHT }}>{discard}{shuffle}</div>
      <div ref={boxRef} role="group" aria-label={`내 카드 ${count}장`} data-testid="my-hand" data-oldmaid-zone={`hand:${zoneId}`}
        className={`${beside ? 'min-w-0 flex-1 ' : ''}${scroll ? 'overflow-x-auto' : 'overflow-x-clip'}`} style={scroll ? { maskImage: EDGE_FADE, WebkitMaskImage: EDGE_FADE } : undefined}>
        <div data-testid="my-hand-row" className="relative" style={{ width: innerWidth, height: rowHeight, margin: scroll ? undefined : '0 auto' }}>
          {cards.map((card, index) => {
            const selected = picker?.selectedIds.includes(card.id) ?? false;
            const pending = picker?.pendingIds.includes(card.id) ?? false;
            // 보낸 짝은 날아갈 때까지 들린 채로 둔다.
            const lifted = index === liftIndex || selected || pending;
            const glowing = picker?.glowIds.includes(card.id) ?? false;
            const angle = angles[index];
            const face = <PlayingCardFace card={card} width={sizes.hand} />;
            return (
              // 바깥(motion layout)은 자리만 옮기고(섞으면 미끄러짐), 기울기·들림은 안쪽 div가 맡는다(layout 애니메이션이 transform을 덮어쓰지 않게).
              <motion.div key={card.id} layout data-testid="my-card" data-card-id={card.id} data-lifted={lifted ? 'true' : undefined}
                data-selected={selected ? 'true' : undefined} data-glow={glowing ? 'true' : undefined}
                data-fresh={fresh.has(card.id) ? 'true' : undefined} transition={{ duration: 0.35 }}
                className="absolute" style={{ left: inset + index * step, top, zIndex: index }}>
                <div className={`rounded-lg transition-transform duration-150 motion-reduce:transition-none ${fresh.has(card.id) ? 'ring-4 ring-yellow-300' : ''} ${lifted ? 'ring-4 ring-(--accent)' : ''} ${glowing && !selected ? 'shadow-[0_0_14px_5px_rgb(253_230_138/0.75)]' : ''}`}
                  style={{ transform: `translateY(${fanDrop(sizes.hand, angle, radius) - (lifted ? lift : 0)}px) rotate(${angle}deg)` }}>
                  {picker ? (
                    // 고를 수 있으면 카드가 버튼이다(터치·마우스·키보드 Enter/Space). 들림이 고른 표시, 같은 숫자 두 장째를 누르면 바로 버린다.
                    // 보낸 짝은 disabled 대신 aria-disabled로 막는다(키보드 초점을 잃지 않게, 누름은 부르는 쪽이 무시한다).
                    <button type="button" data-no-click-sound aria-pressed={selected} aria-label={`${cardName(card)} ${selected ? '고름' : '고르기'}`}
                      aria-disabled={pending || undefined} onClick={() => picker.onPick(card.id)}
                      className="block cursor-pointer rounded-lg aria-disabled:cursor-default focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-(--accent)">{face}</button>
                  ) : face}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
