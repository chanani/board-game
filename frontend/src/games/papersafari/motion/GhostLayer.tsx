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
        const dx = ghost.to.x - ghost.from.x;
        const dy = ghost.to.y - ghost.from.y;
        const scale = ghost.from.width > 0 ? ghost.to.width / ghost.from.width : 1;
        return (
          <motion.div
            key={ghost.id}
            className="absolute"
            style={{ left: ghost.from.x, top: ghost.from.y, width: ghost.from.width, height: ghost.from.height }}
            initial={{ x: 0, y: 0, rotate: 0, scale: 1, opacity: 0 }}
            animate={{ x: [0, dx / 2, dx], y: [0, dy / 2 - 40, dy], rotate: [0, dx >= 0 ? 8 : -8, 0], scale: [1, 1.08, scale], opacity: [1, 1, 1] }}
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
