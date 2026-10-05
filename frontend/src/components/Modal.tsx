import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';

type Props = { open: boolean; title: string; onClose?: () => void; children: ReactNode; wide?: boolean };

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusables(root: HTMLElement | null): HTMLElement[] {
  return root ? Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
}

export function Modal({ open, title, onClose, children, wide = false }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      focusables(boxRef.current)[0]?.focus();
    }
  }, [open]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && onClose) {
      onClose();
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }
    const items = focusables(boxRef.current);
    if (items.length === 0) {
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
      return;
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-wood-900/60 p-4 backdrop-blur-[2px]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onKeyDown={handleKeyDown}
        >
          <motion.div
            ref={boxRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`paper max-h-[90vh] w-full overflow-y-auto p-6 ${wide ? 'max-w-4xl' : 'max-w-lg'}`}
            initial={{ y: 60, scale: 0.92, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 40, scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.3, duration: 0.45 }}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
