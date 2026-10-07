import { Fragment, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { UnoCard } from '../../api/types';
import { useMediaQuery } from '../../lib/useMediaQuery';
import type { TableLayout } from '../../lib/useTableLayout';
import { useElementWidth } from '../../table/useElementWidth';
import { useFreshIds } from '../../table/useFreshIds';
import { cardName, sortHand } from './cards';
import { FAN_RADIUS, fanAngle, fanDrop, fanRoom, handHeadroom, handSpacing, useUnoSizes } from './layout';
import { UnoCardFace } from './UnoCardFace';

type Props = {
  cards: UnoCard[];
  playableIds: number[];
  myTurn: boolean;
  layout: TableLayout;
  /** 날아가는 카드 연출이 찾는 칸 이름에 쓰는 내 id. */
  zoneId: number;
  onPlay: (card: UnoCard) => void;
};

// 터치로 고른 카드를 더 들어 올리는 높이. 눕힌 휴대폰은 한 화면 높이(약 390px)에 손패가 들어가도록 덜 올린다.
const SELECT_LIFT: Record<TableLayout, number> = { pc: 24, portrait: 24, landscape: 16 };
const PLAYABLE_LIFT = 10;
// 줄 맨 아래 남기는 여유.
const BOTTOM_GAP = 4;
const EDGE_FADE = 'linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)';

export function UnoHand({ cards, playableIds, myTurn, layout, zoneId, onPlay }: Props) {
  const fine = useMediaQuery('(pointer: fine)');
  const sizes = useUnoSizes(layout);
  const sorted = sortHand(cards);
  const boxRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(boxRef);
  // PC·휴대폰 모두 부채꼴로 편다. 가장자리 각도로 양끝 여백과 아래 여백을 정해 끝 카드가 잘리지 않게 한다.
  const edgeAngle = Math.abs(fanAngle(0, sorted.length));
  const radius = FAN_RADIUS[layout];
  const room = fanRoom(sizes.hand, edgeAngle, radius);
  // 정밀 포인터는 한 번 눌러 바로 내므로 고르기 들어 올림이 없다. 위쪽 여백은 들어 올린 카드의 진짜 윗끝과 빛까지 품는다.
  const selectLift = fine ? 0 : SELECT_LIFT[layout];
  const angles = sorted.map((_, index) => fanAngle(index, sorted.length));
  const cardTop = handHeadroom(sizes.hand, angles, radius, PLAYABLE_LIFT + selectLift);
  const { step, scroll, inset } = handSpacing(sorted.length, width, sizes, edgeAngle);
  const fresh = useFreshIds(cards);
  const [selected, setSelected] = useState<number | null>(null);
  const cardKey = cards.map((card) => card.id).join(',');

  useEffect(() => setSelected(null), [cardKey, myTurn]);
  useEffect(() => {
    const clear = (event: PointerEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) {
        setSelected(null);
      }
    };
    document.addEventListener('pointerdown', clear);
    return () => document.removeEventListener('pointerdown', clear);
  }, []);

  const press = (card: UnoCard, playable: boolean) => {
    if (!playable) {
      return;
    }
    if (fine || selected === card.id) {
      setSelected(null);
      onPlay(card);
      return;
    }
    setSelected(card.id);
  };
  const keyPress = (event: KeyboardEvent, card: UnoCard, playable: boolean) => {
    if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) {
      return;
    }
    event.preventDefault();
    if (playable) {
      setSelected(null);
      onPlay(card);
    }
  };

  const count = sorted.length;
  const innerWidth = count === 0 ? 0 : (count - 1) * step + sizes.hand + inset * 2;
  return (
    <div ref={boxRef} role="group" aria-label={`내 카드 ${cards.length}장`} data-testid="uno-hand" data-uno-zone={`hand:${zoneId}`}
      className={scroll ? 'overflow-x-auto' : 'overflow-x-clip'}
      style={scroll ? { maskImage: EDGE_FADE, WebkitMaskImage: EDGE_FADE } : undefined}>
      <div className="relative" style={{ width: innerWidth, height: cardTop + sizes.hand * 1.5 + BOTTOM_GAP + room, margin: scroll ? undefined : '0 auto' }}>
        {sorted.map((card, index) => {
          const playable = myTurn && playableIds.includes(card.id);
          const blocked = myTurn && !playable;
          const isSelected = card.id === selected;
          const angle = fanAngle(index, count);
          const lift = (isSelected ? selectLift : 0) + (playable ? PLAYABLE_LIFT : 0);
          const dropY = fanDrop(sizes.hand, angle, radius);
          const isFresh = fresh.has(card.id);
          return (
            <Fragment key={card.id}>
            <button type="button" data-testid="hand-card" data-no-click-sound data-card-id={card.id} data-angle={angle}
              data-lifted={playable ? 'true' : undefined} aria-pressed={isSelected} data-selected={isSelected ? 'true' : undefined} data-fresh={isFresh ? 'true' : undefined}
              aria-disabled={blocked ? 'true' : undefined}
              aria-label={`${cardName(card)}${playable ? ', 낼 수 있어요' : ''}`}
              onClick={() => press(card, playable)} onKeyDown={(event) => keyPress(event, card, playable)}
              className={`absolute rounded-lg transition-transform duration-200 focus-visible:outline-2 focus-visible:outline-mustard-400 ${isFresh ? 'ring-4 ring-yellow-300' : ''}`}
              style={{
                left: inset + index * step, top: cardTop, zIndex: index, width: sizes.hand, height: sizes.hand * 1.5,
                transform: `translateY(${dropY - lift}px) rotate(${angle}deg)`,
                opacity: blocked ? 0.55 : undefined,
                filter: playable ? 'drop-shadow(0 0 6px rgb(255 255 255 / 0.9))' : undefined,
              }}>
              <UnoCardFace card={card} width={sizes.hand} decorative />
            </button>
            {isSelected ? (
              <button type="button" data-no-click-sound aria-label={`${cardName(card)} 내기`} onClick={() => press(card, true)}
                className="press-3d absolute w-max shrink-0 whitespace-nowrap rounded-full bg-(--accent) px-3 py-1 text-xs font-bold text-(--accent-text) shadow"
                style={{ left: inset + index * step + sizes.hand / 2, top: 0, zIndex: count + 1, transform: 'translateX(-50%)' }}>내기</button>
            ) : null}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
