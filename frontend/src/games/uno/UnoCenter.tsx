import { motion, useReducedMotion } from 'motion/react';
import type { UnoCard, UnoColor, UnoDirection } from '../../api/types';
import { cardTilt, COLOR_HEX, COLOR_NAMES } from './cards';
import { UnoCardFace } from './UnoCardFace';

type Props = {
  drawPileCount: number;
  discardTop: UnoCard;
  discardCount: number;
  /** 첫 카드가 와일드라 색을 고르기 전이면 null. */
  currentColor: UnoColor | null;
  direction: UnoDirection;
  canDraw: boolean;
  onDraw: () => void;
  cardWidth: number;
};

const UNDER_TILTS = [-8, 6];

/** 모션은 scaleX를 rotate보다 먼저 적용하므로, 좌우 반전 아래에서는 +360이 눈에는 시계 반대 방향으로 돈다. */
export function spinOf(direction: UnoDirection): { scaleX: number; rotate: number } {
  return { scaleX: direction === 'CLOCKWISE' ? 1 : -1, rotate: 360 };
}

function DirectionArrows({ direction, size }: { direction: UnoDirection; size: number }) {
  const reduce = useReducedMotion();
  const clockwise = direction === 'CLOCKWISE';
  const label = clockwise ? '진행 방향: 시계 방향' : '진행 방향: 시계 반대 방향';
  const { scaleX, rotate } = spinOf(direction);
  const spin = reduce ? undefined : { rotate };
  return (
    <motion.div key={direction} className="pointer-events-none absolute inset-0" initial={reduce ? false : { scale: 1.25 }} animate={{ scale: 1 }} transition={{ duration: 0.4 }}>
    <motion.svg role="img" aria-label={label} data-direction={direction} viewBox="0 0 100 100" width={size} height={size}
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/40"
      style={{ scaleX }}
      animate={spin} transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}>
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
        <path d="M50 6 A44 44 0 0 1 94 50" />
        <path d="M50 94 A44 44 0 0 1 6 50" />
      </g>
      <g fill="currentColor">
        <path d="M94 50 l-6 -9 l12 0 z" transform="rotate(8 94 50)" />
        <path d="M6 50 l6 9 l-12 0 z" transform="rotate(8 6 50)" />
      </g>
    </motion.svg>
    </motion.div>
  );
}

export function UnoCenter({ drawPileCount, discardTop, discardCount, currentColor, direction, canDraw, onDraw, cardWidth }: Props) {
  const reduce = useReducedMotion();
  const height = cardWidth * 1.5;
  const unders = Math.min(Math.max(discardCount - 1, 0), 2);
  const ring = currentColor ? COLOR_HEX[currentColor] : 'rgb(255 255 255 / 0.4)';
  const ringSize = cardWidth * 3.4;
  return (
    <div data-testid="uno-center" className="relative flex flex-col items-center">
      <div className="relative flex items-center justify-center gap-4 px-2 py-2">
        <DirectionArrows direction={direction} size={ringSize} />
        <div className="flex flex-col items-center gap-1">
          <button type="button" aria-label={`카드 뽑기, 남은 ${drawPileCount}장`} data-uno-zone="draw" disabled={!canDraw} onClick={onDraw}
            className={`press-3d relative flex flex-col items-center rounded-lg disabled:cursor-not-allowed ${canDraw ? 'turn-glow' : ''}`}>
            <span aria-hidden="true" className="relative block" style={{ width: cardWidth + 4, height: height + 4 }}>
              {[2, 1, 0].map((offset) => (
                <span key={offset} className="absolute" style={{ left: 2 - offset, top: 2 - offset }}>
                  <UnoCardFace card={null} width={cardWidth} decorative />
                </span>
              ))}
            </span>
            <span className="felt-ink mt-1 text-xs font-bold">{drawPileCount}장</span>
          </button>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div data-uno-zone="discard" data-testid="color-ring" data-color={currentColor ?? 'NONE'}
            className="relative rounded-lg" style={{ width: cardWidth, height, boxShadow: `0 0 0 6px ${ring}`, transition: 'box-shadow 0.3s' }}>
            {UNDER_TILTS.slice(0, unders).map((tilt) => (
              <span key={tilt} data-testid="discard-under" aria-hidden="true" className="absolute inset-0 rounded-lg bg-white shadow"
                style={{ transform: `rotate(${tilt}deg)` }} />
            ))}
            <div className="absolute inset-0" style={{ transform: `rotate(${cardTilt(discardTop.id)}deg)` }}>
              <motion.div key={discardTop.id} initial={reduce ? false : { scale: 0.9 }} animate={{ scale: 1 }} transition={{ duration: 0.2 }}>
                <UnoCardFace card={discardTop} width={cardWidth} />
              </motion.div>
            </div>
          </div>
          <p data-testid="current-color" className="felt-ink mt-2 text-xs font-bold">
            지금 색: {currentColor ? COLOR_NAMES[currentColor] : '고르는 중'}
          </p>
        </div>
      </div>
    </div>
  );
}
