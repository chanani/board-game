import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';

type Props = { open: boolean; title: string; onClose?: () => void; children: ReactNode; wide?: boolean; padding?: 'normal' | 'roomy' };

const PADDING = { normal: 'p-6', roomy: 'p-5 sm:p-8' };

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusables(root: HTMLElement | null): HTMLElement[] {
  return root ? Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
}

function focusIsFree(box: HTMLElement | null): boolean {
  const active = document.activeElement;
  return !active || active === document.body || Boolean(box?.contains(active));
}

export function Modal({ open, title, onClose, children, wide = false, padding = 'normal' }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // 누른 버튼이 비활성이 되거나 글자를 누르면 포커스가 body로 빠지므로, Esc는 문서에서 받는다.
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || !onCloseRef.current || !focusIsFree(boxRef.current)) {
        return;
      }
      onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      focusables(boxRef.current)[0]?.focus();
    }
  }, [open]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
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
            tabIndex={-1}
            className={`paper outline-none max-h-[90vh] w-full overflow-y-auto ${PADDING[padding]} ${wide ? 'max-w-4xl' : 'max-w-lg'}`}
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
