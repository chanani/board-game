import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { PC_QUERY, useMediaQuery } from '../../../lib/useMediaQuery';
import { LogList } from './LogList';
import { LogModal } from './LogModal';
import type { LogEntry } from '../../../lib/eventLog';
import type { Nickname } from './LogList';
import { ScrollIcon } from '../../../components/icons';

/** 상태 바의 진행 기록 버튼. 기록 창은 위에서 살짝 내려오며 열리고 올라가며 닫힌다(동작 줄이기면 투명도만). */
export function LogPopover({ log, nicknameOf }: { log: LogEntry[]; nicknameOf?: Nickname }) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const pc = useMediaQuery(PC_QUERY);
  const offset = reduced ? 0 : -8;
  return (
    <div className="relative shrink-0">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="진행 기록"
        className="pill press-3d flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold">
        <ScrollIcon className="h-3.5 w-3.5" /><span className="hidden sm:inline">진행 기록</span>
      </button>
      {pc ? null : <LogModal open={open} onClose={() => setOpen(false)} log={log} nicknameOf={nicknameOf} />}
      <AnimatePresence>
        {open && pc ? (
          <motion.div key="log" data-testid="log-popover" style={{ transformOrigin: 'top right' }}
            initial={{ opacity: 0, y: offset, scale: reduced ? 1 : 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: offset, scale: reduced ? 1 : 0.97 }} transition={{ duration: 0.18, ease: 'easeOut' }}
            className="paper absolute right-0 top-9 z-30 w-72 max-w-[calc(100vw-2rem)] p-3">
            <h3 className="mb-1 text-sm font-bold">진행 기록</h3>
            <LogList log={log} nicknameOf={nicknameOf} className="max-h-56" />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
