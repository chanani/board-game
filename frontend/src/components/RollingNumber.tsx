import { AnimatePresence, motion } from 'motion/react';

export function RollingNumber({ value, className = '' }: { value: number | null; className?: string }) {
  const text = value === null ? '–' : String(value);
  return (
    <span className={`relative inline-flex overflow-hidden align-bottom ${className}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={text} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '-100%' }} transition={{ duration: 0.25 }}>
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
