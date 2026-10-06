import { useState, type ComponentType } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { chatTime } from '../../../lib/format';
import type { LogEntry, LogKind } from '../../../lib/eventLog';
import { CardsIcon, ClockIcon, DotIcon, EyeIcon, PlayIcon, RecycleIcon, ScrollIcon, SwapIcon, TrophyIcon, UndoIcon } from '../../../components/icons';

type Nickname = (memberId: number) => string;

const KIND_STYLE: Record<LogKind, { Icon: ComponentType<{ className?: string }>; bg: string }> = {
  'draw-deck': { Icon: CardsIcon, bg: 'bg-amber-100' },
  'draw-discard': { Icon: RecycleIcon, bg: 'bg-orange-100' },
  place: { Icon: SwapIcon, bg: 'bg-green-100' },
  undo: { Icon: UndoIcon, bg: 'bg-indigo-100' },
  peek: { Icon: EyeIcon, bg: 'bg-sky-100' },
  start: { Icon: PlayIcon, bg: 'bg-lime-100' },
  result: { Icon: TrophyIcon, bg: 'bg-yellow-100' },
  timeout: { Icon: ClockIcon, bg: 'bg-rose-100' },
  other: { Icon: DotIcon, bg: 'bg-stone-200' },
};

export function KindDot({ kind, small = false }: { kind: LogKind; small?: boolean }) {
  const { Icon, bg } = KIND_STYLE[kind];
  const size = small ? 'h-4 w-4' : 'h-[22px] w-[22px]';
  const icon = small ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5';
  return (
    <span aria-hidden="true" data-kind={kind} className={`flex shrink-0 items-center justify-center rounded-full text-wood-800 ${bg} ${size}`}>
      <Icon className={icon} />
    </span>
  );
}

/** 문장에서 행동한 사람의 닉네임을 굵게 보여준다. 닉네임을 찾지 못하면 문장 그대로 둔다. */
export function Sentence({ entry, nicknameOf }: { entry: LogEntry; nicknameOf?: Nickname }) {
  const name = entry.actorId !== undefined && nicknameOf ? nicknameOf(entry.actorId) : '';
  const at = name ? entry.text.indexOf(name) : -1;
  if (at < 0) {
    return <>{entry.text}</>;
  }
  return <>{entry.text.slice(0, at)}<b className="font-bold">{name}</b>{entry.text.slice(at + name.length)}</>;
}

function iso(at: number): string {
  return new Date(at).toISOString();
}

/** 상태 바의 진행 기록 버튼. 기록 창은 위에서 살짝 내려오며 열리고 올라가며 닫힌다(동작 줄이기면 투명도만). */
export function LogPopover({ log, nicknameOf }: { log: LogEntry[]; nicknameOf?: Nickname }) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const offset = reduced ? 0 : -8;
  return (
    <div className="relative shrink-0">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="진행 기록"
        className="pill press-3d flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold">
        <ScrollIcon className="h-3.5 w-3.5" /><span className="hidden sm:inline">진행 기록</span>
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div key="log" data-testid="log-popover" style={{ transformOrigin: 'top right' }}
            initial={{ opacity: 0, y: offset, scale: reduced ? 1 : 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: offset, scale: reduced ? 1 : 0.97 }} transition={{ duration: 0.18, ease: 'easeOut' }}
            className="paper absolute right-0 top-9 z-30 w-72 max-w-[calc(100vw-2rem)] p-3">
            <h3 className="mb-1 text-sm font-bold">진행 기록</h3>
            <ul className="scroll-thin max-h-56 overflow-y-auto pr-1 text-sm text-stone-600">
              {log.length === 0 ? <li className="text-stone-400">아직 기록이 없어요.</li> : null}
              {log.map((entry) => (
                <li key={entry.id} className="flex items-center gap-2 border-b border-dashed border-cream-300 py-1.5 text-xs last:border-b-0">
                  <KindDot kind={entry.kind} />
                  <span className="min-w-0 flex-1"><Sentence entry={entry} nicknameOf={nicknameOf} /></span>
                  <time dateTime={iso(entry.at)} className="shrink-0 text-[10px] text-stone-500">{chatTime(iso(entry.at))}</time>
                </li>
              ))}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
