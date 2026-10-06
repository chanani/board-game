import { AnimatePresence, motion } from 'motion/react';
import { CloseIcon } from './icons';
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';

/** first: 첫 버튼(기본), dialog: 대화상자 자체. 갑자기 뜨는 창은 dialog로 두어 치던 Enter·Space가 버튼을 누르지 않게 한다. */
type InitialFocus = 'first' | 'dialog';

type Props = { open: boolean; title: string; onClose?: () => void; children: ReactNode; wide?: boolean; padding?: 'normal' | 'roomy'; initialFocus?: InitialFocus };

const PADDING = { normal: 'p-6', roomy: 'p-5 sm:p-8' };

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusables(root: HTMLElement | null): HTMLElement[] {
  return root ? Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
}

function focusIsFree(box: HTMLElement | null): boolean {
  const active = document.activeElement;
  return !active || active === document.body || Boolean(box?.contains(active));
}

function focusInitial(box: HTMLElement | null, initialFocus: InitialFocus) {
  if (initialFocus === 'dialog') {
    box?.focus({ preventScroll: true });
    return;
  }
  const items = focusables(box);
  (items.find((item) => item.dataset.close === undefined) ?? items[0])?.focus();
}

export function Modal({ open, title, onClose, children, wide = false, padding = 'normal', initialFocus = 'first' }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const downOnBackdrop = useRef(false);
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
      focusInitial(boxRef.current, initialFocus);
    }
  }, [open, initialFocus]);

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
    // 대화상자 자체에 포커스가 있으면(initialFocus="dialog") 첫 칸으로 보고, Shift+Tab이 밖으로 새지 않게 한다.
    const atStart = document.activeElement === first || document.activeElement === boxRef.current;
    if (event.shiftKey && atStart) {
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
          data-testid="modal-backdrop"
          onMouseDown={(event) => { downOnBackdrop.current = event.target === event.currentTarget; }}
          onClick={(event) => {
            const closing = downOnBackdrop.current && event.target === event.currentTarget;
            downOnBackdrop.current = false;
            if (closing) {
              onClose?.();
            }
          }}
        >
          <motion.div
            ref={boxRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className={`paper relative outline-none max-h-[90vh] w-full overflow-y-auto ${PADDING[padding]} ${wide ? 'max-w-4xl' : 'max-w-lg'}`}
            initial={{ y: 60, scale: 0.92, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 40, scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.3, duration: 0.45 }}
          >
            {onClose ? (
              <div className="pointer-events-none sticky top-0 z-10 flex h-0 items-start justify-end">
                <button type="button" aria-label="닫기" data-close onClick={onClose}
                  className="pointer-events-auto -mr-2 -mt-2 rounded-full bg-cream-50 p-1.5 shadow-[0_0_0_4px_var(--color-cream-50)] text-stone-500 hover:bg-cream-200 hover:text-wood-800">
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
            ) : null}
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
