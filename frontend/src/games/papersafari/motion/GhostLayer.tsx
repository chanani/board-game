import { motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { CardFace } from '../CardFace';
import { TRAVEL_MS, type Ghost } from './useCardMotion';

export function GhostLayer({ ghosts }: { ghosts: Ghost[] }) {
  if (ghosts.length === 0) {
    return null;
  }
  return createPortal(
    <div aria-hidden="true" data-testid="ghost-layer" className="pointer-events-none fixed inset-0 z-30">
      {ghosts.map((ghost) => {
        // 크기 변화는 중심 기준이므로 이동량도 중심끼리 잰다.
        const dx = ghost.to.x + ghost.to.width / 2 - (ghost.from.x + ghost.from.width / 2);
        const dy = ghost.to.y + ghost.to.height / 2 - (ghost.from.y + ghost.from.height / 2);
        const scaleX = ghost.from.width > 0 ? ghost.to.width / ghost.from.width : 1;
        const scaleY = ghost.from.height > 0 ? ghost.to.height / ghost.from.height : 1;
        return (
          <motion.div
            key={ghost.id}
            className="absolute"
            style={{ left: ghost.from.x, top: ghost.from.y, width: ghost.from.width, height: ghost.from.height }}
            initial={{ x: 0, y: 0, rotate: 0, scaleX: 1, scaleY: 1, opacity: 0 }}
            animate={{
              x: [0, dx / 2, dx], y: [0, dy / 2 - 40, dy], rotate: [0, dx >= 0 ? 8 : -8, 0],
              scaleX: [1, 1.08 * ((1 + scaleX) / 2), scaleX], scaleY: [1, 1.08 * ((1 + scaleY) / 2), scaleY], opacity: [1, 1, 1],
            }}
            transition={{ duration: TRAVEL_MS / 1000, delay: ghost.delay / 1000, ease: 'easeInOut' }}
          >
            <div className="h-full w-full [&>button]:h-full [&>button]:w-full">
              <CardFace card={ghost.card} faceUp={ghost.card !== null} known={false} />
            </div>
          </motion.div>
        );
      })}
    </div>,
    document.body,
  );
}
