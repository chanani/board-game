import { motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { useRoomTheme } from '../../../room/roomTheme';
import { UnoCardFace } from '../UnoCardFace';
import type { UnoGhost } from './useUnoMotion';

export function UnoGhostLayer({ ghosts }: { ghosts: UnoGhost[] }) {
  // body로 빼내므로 방 테마 변수가 닿지 않는다. 날아가는 카드 뒷면도 방 테마를 따르게 직접 단다.
  const theme = useRoomTheme();
  if (ghosts.length === 0) {
    return null;
  }
  return createPortal(
    <div aria-hidden="true" data-testid="uno-ghost-layer" data-theme={theme} className="pointer-events-none fixed inset-0 z-30">
      {ghosts.map((ghost) => {
        const dx = ghost.to.x + ghost.to.width / 2 - (ghost.from.x + ghost.from.width / 2);
        const dy = ghost.to.y + ghost.to.height / 2 - (ghost.from.y + ghost.from.height / 2);
        const scale = ghost.from.width > 0 ? ghost.to.width / ghost.from.width : 1;
        return (
          <motion.div key={ghost.id} className="absolute" style={{ left: ghost.from.x, top: ghost.from.y, width: ghost.from.width, height: ghost.from.height, perspective: 600 }}
            initial={{ x: 0, y: 0, scale: 1, opacity: 0 }}
            animate={{ x: dx, y: dy, scale, opacity: 1 }}
            transition={{ duration: ghost.duration / 1000, delay: ghost.delay / 1000, ease: 'easeInOut', opacity: { duration: 0, delay: ghost.delay / 1000 } }}>
            <motion.div initial={ghost.flip ? { rotateY: 180 } : false} animate={{ rotateY: 0 }}
              transition={{ duration: ghost.duration / 1000, delay: ghost.delay / 1000 }}>
              <UnoCardFace card={ghost.card} width={ghost.from.width} decorative />
            </motion.div>
          </motion.div>
        );
      })}
    </div>,
    document.body,
  );
}
