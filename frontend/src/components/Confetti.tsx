import { motion, useReducedMotion } from 'motion/react';
import { useMemo } from 'react';

const COLORS = ['#f2b33d', '#2f8a57', '#b4461a', '#fffaf0', '#7c3aed'];
const PIECES = 36;

export function Confetti({ active }: { active: boolean }) {
  const reduced = useReducedMotion();
  const pieces = useMemo(
    () => Array.from({ length: PIECES }, (_, index) => ({
      id: index,
      left: (index * 37) % 100,
      delay: (index % 9) * 0.06,
      rotate: (index * 53) % 360,
      color: COLORS[index % COLORS.length],
    })),
    [],
  );
  if (!active || reduced) {
    return null;
  }
  return (
    <div aria-hidden="true" data-testid="confetti" className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((piece) => (
        <motion.span
          key={piece.id}
          className="absolute top-0 h-3 w-2 rounded-sm"
          style={{ left: `${piece.left}%`, backgroundColor: piece.color }}
          initial={{ y: -20, rotate: 0, opacity: 1 }}
          animate={{ y: '105vh', rotate: piece.rotate + 360, opacity: [1, 1, 0] }}
          transition={{ duration: 2, delay: piece.delay, ease: 'easeIn' }}
        />
      ))}
    </div>
  );
}
