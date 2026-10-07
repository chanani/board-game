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
        const seconds = ghost.duration / 1000;
        const delay = ghost.delay / 1000;
        const hidden = { backfaceVisibility: 'hidden' as const };
        // flip이면(내가 뽑은 카드) 뒷면으로 떠나 날아오는 동안 앞면으로 뒤집힌다(우노 고스트와 같은 방식).
        return (
          <motion.div key={ghost.id} className="absolute" style={{ left: box.left, top: box.top, width: box.width, height: box.height, perspective: 600 }}
            initial={{ x: 0, y: 0, opacity: 0 }} animate={{ x: box.dx, y: box.dy, opacity: 1 }}
            transition={{ duration: seconds, delay, ease: 'easeInOut', opacity: { duration: 0, delay } }}>
            {ghost.flip ? (
              <motion.div data-testid="oldmaid-ghost-flip" initial={{ rotateY: 180 }} animate={{ rotateY: 0 }} transition={{ duration: seconds, delay }}
                className="relative h-full w-full" style={{ transformStyle: 'preserve-3d' }}>
                <div className="absolute inset-0" style={hidden}><PlayingCardFace card={ghost.card} width={ghost.width} decorative /></div>
                <div className="absolute inset-0" style={{ ...hidden, transform: 'rotateY(180deg)' }}><PlayingCardFace card={null} width={ghost.width} decorative /></div>
              </motion.div>
            ) : <PlayingCardFace card={ghost.card} width={ghost.width} decorative />}
          </motion.div>
        );
      })}
    </div>,
    document.body,
  );
}
