import { useState } from 'react';
import { chatTime } from '../../../lib/format';
import type { LogEntry, LogKind } from '../../../lib/eventLog';

type Props = { instruction: string; myTurn: boolean; log: LogEntry[]; nicknameOf?: (memberId: number) => string; compact?: boolean };

const KIND_STYLE: Record<LogKind, { glyph: string; bg: string }> = {
  'draw-deck': { glyph: '🂠', bg: 'bg-amber-100' },
  'draw-discard': { glyph: '♻', bg: 'bg-orange-100' },
  place: { glyph: '⇄', bg: 'bg-green-100' },
  undo: { glyph: '↶', bg: 'bg-indigo-100' },
  peek: { glyph: '🐘', bg: 'bg-sky-100' },
  start: { glyph: '▶', bg: 'bg-lime-100' },
  result: { glyph: '🏆', bg: 'bg-yellow-100' },
  other: { glyph: '•', bg: 'bg-stone-200' },
};

function KindDot({ kind, small = false }: { kind: LogKind; small?: boolean }) {
  const { glyph, bg } = KIND_STYLE[kind];
  const size = small ? 'h-4 w-4 text-[9px]' : 'h-[22px] w-[22px] text-[11px]';
  return <span aria-hidden="true" data-kind={kind} className={`flex shrink-0 items-center justify-center rounded-full text-wood-800 ${bg} ${size}`}>{glyph}</span>;
}

/** 문장에서 행동한 사람의 닉네임을 굵게 보여준다. 닉네임을 찾지 못하면 문장 그대로 둔다. */
function Sentence({ entry, nicknameOf }: { entry: LogEntry; nicknameOf?: (memberId: number) => string }) {
  const name = entry.actorId !== undefined && nicknameOf ? nicknameOf(entry.actorId) : '';
  if (!name || !entry.text.startsWith(name)) {
    return <>{entry.text}</>;
  }
  return <><b className="font-bold">{name}</b>{entry.text.slice(name.length)}</>;
}

function iso(at: number): string {
  return new Date(at).toISOString();
}

/**
 * compact(PC가 아닌 배치)에서는 안내·기록 버튼을 한 줄 격자에 고정해, 안내 문구 길이에 따라 줄바꿈이 달라지지 않게 한다.
 * 마지막 기록 줄도 비어 있을 때부터 한 줄 높이를 잡아 두어 첫 기록이 생길 때 아래 화면이 밀리지 않는다.
 */
export function Hud({ instruction, myTurn, log, nicknameOf, compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const frame = compact ? 'grid grid-cols-[minmax(0,1fr)_auto]' : 'flex flex-wrap justify-between';
  const latest = log[0];
  return (
    <div data-testid="hud" className={`${frame} items-center gap-2`}>
      <p role="status" data-testid="instruction" className={`flex min-h-[3.25rem] items-center justify-center rounded-2xl px-4 py-1.5 text-center text-sm font-bold shadow-[0_3px_0_rgb(0_0_0/0.3)] ${myTurn ? 'turn-glow bg-mustard-400 text-wood-800' : 'bg-cream-50 text-wood-800'}`}>
        <span className="line-clamp-2">{instruction}</span>
      </p>
      <div className="relative">
        <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}
          className="press-3d rounded-lg bg-cream-50 px-3 py-1 text-xs font-bold text-wood-800 shadow-[0_3px_0_var(--color-cream-300)]">
          📜 진행 기록
        </button>
        {open ? (
          <div className="paper absolute right-0 top-9 z-30 w-72 p-3">
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
          </div>
        ) : null}
      </div>
      <p data-testid="last-log" className="col-span-full flex h-4 w-full justify-center text-xs leading-4">
        {latest ? (
          <span className="pill-strong flex max-w-full items-center gap-1 rounded-full px-2">
            <KindDot kind={latest.kind} small />
            <span className="truncate"><Sentence entry={latest} nicknameOf={nicknameOf} /></span>
          </span>
        ) : null}
      </p>
    </div>
  );
}
