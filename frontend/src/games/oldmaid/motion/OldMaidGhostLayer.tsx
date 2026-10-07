import { motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { useRoomTheme } from '../../../room/roomTheme';
import { ghostBox } from '../../../table/ghostGeometry';
import { PlayingCardFace } from '../PlayingCardFace';
import type { OldMaidGhost } from './useOldMaidMotion';

/** 날아가는 카드. body로 빼내므로 방 테마(카드 뒷면 색)를 직접 단다. 동작 줄이기면 비행이 없어 그리지 않는다. */
export function OldMaidGhostLayer({ ghosts }: { ghosts: OldMaidGhost[] }) {
  const theme = useRoomTheme();
  if (ghosts.length === 0) {
    return null;
  }
  return createPortal(
    <div aria-hidden="true" data-testid="oldmaid-ghost-layer" data-theme={theme} className="pointer-events-none fixed inset-0 z-30">
      {ghosts.map((ghost) => {
        const box = ghostBox(ghost.from, ghost.to, ghost.width);
        return (
          <motion.div key={ghost.id} className="absolute" style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
            initial={{ x: 0, y: 0, opacity: 0 }} animate={{ x: box.dx, y: box.dy, opacity: 1 }}
            transition={{ duration: ghost.duration / 1000, delay: ghost.delay / 1000, ease: 'easeInOut', opacity: { duration: 0, delay: ghost.delay / 1000 } }}>
            <PlayingCardFace card={ghost.card} width={ghost.width} decorative />
          </motion.div>
        );
      })}
    </div>,
    document.body,
  );
}
