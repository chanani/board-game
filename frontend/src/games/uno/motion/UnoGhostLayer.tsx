import { motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { useRoomTheme } from '../../../room/roomTheme';
import { UnoCardFace } from '../UnoCardFace';
import { ghostBox } from './ghostGeometry';
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
        const box = ghostBox(ghost.from, ghost.to, ghost.width);
        const seconds = ghost.duration / 1000;
        const delay = ghost.delay / 1000;
        const hidden = { backfaceVisibility: 'hidden' as const };
        return (
          <motion.div key={ghost.id} className="absolute" style={{ left: box.left, top: box.top, width: box.width, height: box.height, perspective: 600 }}
            initial={{ x: 0, y: 0, opacity: 0 }} animate={{ x: box.dx, y: box.dy, opacity: 1 }}
            transition={{ duration: seconds, delay, ease: 'easeInOut', opacity: { duration: 0, delay } }}>
            <motion.div initial={ghost.flip ? { rotateY: 180 } : false} animate={{ rotateY: 0 }} transition={{ duration: seconds, delay }}
              className="relative h-full w-full" style={{ transformStyle: 'preserve-3d' }}>
              <div className="absolute inset-0" style={hidden}><UnoCardFace card={ghost.card} width={ghost.width} decorative /></div>
              {ghost.flip ? (
                <div className="absolute inset-0" style={{ ...hidden, transform: 'rotateY(180deg)' }}><UnoCardFace card={null} width={ghost.width} decorative /></div>
              ) : null}
            </motion.div>
          </motion.div>
        );
      })}
    </div>,
    document.body,
  );
}
