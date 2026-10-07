import { Fragment, useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import type { UnoCard } from '../../api/types';
import { useMediaQuery } from '../../lib/useMediaQuery';
import type { TableLayout } from '../../lib/useTableLayout';
import { cardName, sortHand } from './cards';
import { FAN_RADIUS, fanAngle, fanDrop, fanRoom, handSpacing, useUnoSizes } from './layout';
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

const FRESH_MS = 1200;
const TOP = 40;
const SELECT_LIFT = 24;
const PLAYABLE_LIFT = 10;
const EDGE_FADE = 'linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)';

function useWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

/** 이전 렌더에 없던 카드 id를 1.2초 동안 돌려준다(첫 렌더는 표시하지 않는다). */
function useFreshIds(cards: UnoCard[]): Set<number> {
  const known = useRef<Set<number> | null>(null);
  const [fresh, setFresh] = useState<Set<number>>(new Set());
  const key = cards.map((card) => card.id).join(',');
  useEffect(() => {
    const ids = new Set(cards.map((card) => card.id));
    const previous = known.current;
    known.current = ids;
    if (previous === null) {
      return;
    }
    const added = new Set([...ids].filter((id) => !previous.has(id)));
    if (added.size === 0) {
      setFresh((current) => (current.size === 0 ? current : new Set()));
      return;
    }
    setFresh(added);
    const timer = setTimeout(() => setFresh(new Set()), FRESH_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return fresh;
}

export function UnoHand({ cards, playableIds, myTurn, layout, zoneId, onPlay }: Props) {
  const fine = useMediaQuery('(pointer: fine)');
  const sizes = useUnoSizes(layout);
  const sorted = sortHand(cards);
  const boxRef = useRef<HTMLDivElement>(null);
  const width = useWidth(boxRef);
  // PC·휴대폰 모두 부채꼴로 편다. 가장자리 각도로 양끝 여백과 아래 여백을 정해 끝 카드가 잘리지 않게 한다.
  const edgeAngle = Math.abs(fanAngle(0, sorted.length));
  const radius = FAN_RADIUS[layout];
  // 부채꼴 아래 여백 일부를 위쪽 들어 올림 칸의 남는 몫(TOP - 최대 들어 올림)으로 메워 줄 높이를 덜 늘린다(눕힌 화면 한 화면 맞춤).
  const room = fanRoom(sizes.hand, edgeAngle, radius);
  const rise = Math.min(room, TOP - SELECT_LIFT - PLAYABLE_LIFT);
  const cardTop = TOP - rise;
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
      <div className="relative" style={{ width: innerWidth, height: sizes.hand * 1.5 + 44 + room - rise, margin: scroll ? undefined : '0 auto' }}>
        {sorted.map((card, index) => {
          const playable = myTurn && playableIds.includes(card.id);
          const blocked = myTurn && !playable;
          const isSelected = card.id === selected;
          const angle = fanAngle(index, count);
          const lift = (isSelected ? SELECT_LIFT : 0) + (playable ? PLAYABLE_LIFT : 0);
          const dropY = fanDrop(sizes.hand, angle, radius);
          const isFresh = fresh.has(card.id);
          return (
            <Fragment key={card.id}>
            <button type="button" data-testid="hand-card" data-card-id={card.id} data-angle={angle}
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
              <button type="button" aria-label={`${cardName(card)} 내기`} onClick={() => press(card, true)}
                className="press-3d absolute rounded-full bg-(--accent) px-3 py-1 text-xs font-bold text-(--accent-text) shadow"
                style={{ left: inset + index * step + sizes.hand / 2, top: 0, zIndex: count + 1, transform: 'translateX(-50%)' }}>내기</button>
            ) : null}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
