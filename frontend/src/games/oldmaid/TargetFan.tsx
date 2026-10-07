import { Fragment, useCallback, useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';
import { useMediaQuery } from '../../lib/useMediaQuery';
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
  /** 받은 신호 자리(뽑는 사람이 아닌 화면에서 들어 올릴 카드). */
  liftIndex: number | null;
  layout: TableLayout;
  /** 내가 뽑는 사람이면 카드를 누를 수 있다. */
  interactive?: boolean;
  onPeek?: (index: number | null) => void;
  onDraw?: (index: number) => void;
};

/**
 * 뽑히는 상대의 손패를 가운데에 크게 펼친 뒷면 부채(D17: 모두에게 보인다).
 * 정밀 포인터는 올리면 신호·누르면 뽑기, 터치는 첫 탭에 고르고(신호) 다시 탭하거나 "뽑기"로 뽑는다, 키보드는 초점에 신호·Enter/Space로 뽑기.
 * 부채 밖을 누르거나 초점이 부채 밖으로 나가면 고르기를 풀고 null 신호를 보낸다(들림이 남지 않게, F-b11).
 */
export function TargetFan({ ownerName, count, cardWidth, minVisible, liftIndex, layout, interactive = false, onPeek, onDraw }: Props) {
  const fine = useMediaQuery('(pointer: fine)');
  const boxRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(boxRef);
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const radius = FAN_RADIUS[layout];
  const edgeAngle = Math.abs(fanAngle(0, count));
  const angles = Array.from({ length: count }, (_, index) => fanAngle(index, count));
  const lift = cardWidth * 1.5 * LIFT_RATIO;
  // 가장자리 카드가 기울어 옆·아래로 삐져나오고 들린 카드가 위로 올라가도 잘리지 않게 여백을 두고, 장수가 줄어도 높이가 출렁이지 않게 최대 각도로 잰다.
  const { headroom: top, room } = fixedFanRoom(cardWidth, radius, lift);
  const { step, scroll, inset } = fanSpacing(count, width, cardWidth, minVisible, edgeAngle);
  const innerWidth = count === 0 ? 0 : (count - 1) * step + cardWidth + inset * 2;
  const shown = interactive ? (selected ?? hovered) : liftIndex;
  const picking = interactive && (selected !== null || hovered !== null);

  useEffect(() => {
    setSelected(null);
    setHovered(null);
  }, [count, interactive]);

  const release = useCallback(() => {
    setSelected(null);
    setHovered(null);
    onPeek?.(null);
  }, [onPeek]);
  // 고른(터치)·초점 둔(키보드) 카드가 있을 때 부채 밖을 누르면 고르기를 취소한다.
  useEffect(() => {
    if (!picking) {
      return undefined;
    }
    const clear = (event: PointerEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) {
        release();
      }
    };
    document.addEventListener('pointerdown', clear);
    return () => document.removeEventListener('pointerdown', clear);
  }, [picking, release]);

  const point = (index: number) => {
    setHovered(index);
    onPeek?.(index);
  };
  const press = (index: number) => {
    if (fine || selected === index) {
      setSelected(null);
      onDraw?.(index);
      return;
    }
    setSelected(index);
    onPeek?.(index);
  };
  const keyPress = (event: KeyboardEvent, index: number) => {
    if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) {
      return;
    }
    event.preventDefault();
    setSelected(null);
    onDraw?.(index);
  };
  const leave = () => {
    if (!fine || !interactive) {
      return;
    }
    setHovered(null);
    onPeek?.(null);
  };
  const blur = (event: FocusEvent) => {
    if (!picking || boxRef.current?.contains(event.relatedTarget as Node | null)) {
      return;
    }
    release();
  };

  return (
    <div ref={boxRef} role="group" aria-label={`${ownerName}님의 카드 ${count}장`} data-testid="target-fan" data-oldmaid-zone="target"
      className={`w-full min-w-0 ${scroll ? 'overflow-x-auto' : 'overflow-x-clip'}`}
      style={scroll ? { maskImage: EDGE_FADE, WebkitMaskImage: EDGE_FADE } : undefined} onPointerLeave={leave} onBlur={blur}>
      <div className="relative" style={{ width: innerWidth, height: top + cardWidth * 1.5 + room, margin: scroll ? undefined : '0 auto' }}>
        {angles.map((angle, index) => {
          const lifted = index === shown;
          const style = { left: inset + index * step, top, zIndex: index, transform: `translateY(${fanDrop(cardWidth, angle, radius) - (lifted ? lift : 0)}px) rotate(${angle}deg)` };
          const face = <PlayingCardFace card={null} width={cardWidth} decorative className={lifted ? 'rounded-lg ring-4 ring-(--accent)' : undefined} />;
          if (!interactive) {
            return (
              <span key={index} data-testid="target-card" data-index={index} data-lifted={lifted ? 'true' : undefined} aria-hidden="true"
                className="absolute transition-transform duration-150 motion-reduce:transition-none" style={style}>{face}</span>
            );
          }
          return (
            <Fragment key={index}>
              <button type="button" data-testid="target-card" data-index={index} data-lifted={lifted ? 'true' : undefined} data-no-click-sound
                aria-label={`${ownerName}님의 ${index + 1}번째 카드`} aria-current={lifted ? 'true' : undefined}
                onPointerEnter={fine ? () => point(index) : undefined} onFocus={() => point(index)}
                onClick={() => press(index)} onKeyDown={(event) => keyPress(event, index)}
                className="absolute cursor-pointer rounded-lg transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-mustard-400 motion-reduce:transition-none"
                style={style}>{face}</button>
              {/* "뽑기"는 줄 안(위 여백)에 띄워 스크롤 줄에서도 잘리지 않는다. 들린 카드 뒷면 윗부분만 가린다. */}
              {selected === index && !fine ? (
                <button type="button" data-no-click-sound aria-label={`${ownerName}님의 ${index + 1}번째 카드 뽑기`} onClick={() => press(index)}
                  className="press-3d absolute w-max whitespace-nowrap rounded-full bg-(--accent) px-3 py-1 text-xs font-bold text-(--accent-text) shadow"
                  style={{ left: inset + index * step + cardWidth / 2, top: 0, zIndex: count + 1, transform: 'translateX(-50%)' }}>뽑기</button>
              ) : null}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
