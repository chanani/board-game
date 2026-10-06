import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

type Props = { checked: boolean; onChange: (checked: boolean) => void; label: string; icon?: ReactNode };

export function ToggleSwitch({ checked, onChange, label, icon }: Props) {
  const reduceMotion = useReducedMotion();
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className="flex items-center gap-2 text-sm font-semibold text-wood-700">
      {icon}
      <span>{label}</span>
      <span className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${checked ? 'bg-mustard-400' : 'bg-stone-300'}`}>
        <motion.span className="block h-5 w-5 rounded-full bg-cream-50 shadow" animate={{ x: checked ? 20 : 0 }}
          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 30 }} />
      </span>
    </button>
  );
}
