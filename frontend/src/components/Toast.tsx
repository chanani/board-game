import { AnimatePresence, motion } from 'motion/react';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

type Tone = 'error' | 'info';
type ToastItem = { id: number; message: string; tone: Tone };
type ToastApi = { show: (message: string, tone?: Tone) => void };

const ToastContext = createContext<ToastApi | null>(null);

const TONES: Record<Tone, string> = {
  error: 'bg-brick-500 text-cream-50 shadow-[0_4px_0_var(--color-brick-700),0_12px_20px_rgb(0_0_0/0.35)]',
  info: 'bg-cream-50 text-wood-800 shadow-[0_4px_0_var(--color-cream-300),0_12px_20px_rgb(0_0_0/0.35)]',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const show = useCallback((message: string, tone: Tone = 'error') => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3000);
  }, []);

  const api = useMemo(() => ({ show }), [show]);
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div key={toast.id} role="status" layout
              initial={{ y: 40, opacity: 0, rotate: -2 }} animate={{ y: 0, opacity: 1, rotate: 0 }} exit={{ y: 30, opacity: 0 }}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${TONES[toast.tone]}`}>
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('ToastProvider 안에서만 쓸 수 있어요.');
  }
  return context;
}
