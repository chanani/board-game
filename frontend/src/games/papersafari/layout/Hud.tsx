import { useState } from 'react';

type Props = { roundNumber: number; instruction: string; myTurn: boolean; log: string[] };

export function Hud({ roundNumber, instruction, myTurn, log }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="rounded-lg bg-black/35 px-3 py-1 text-sm font-bold text-cream-50">🦁 {roundNumber}라운드</span>
      <p role="status" className={`rounded-full px-4 py-1.5 text-sm font-bold shadow-[0_3px_0_rgb(0_0_0/0.3)] ${myTurn ? 'turn-glow bg-mustard-400 text-wood-800' : 'bg-cream-50 text-wood-800'}`}>
        {instruction}
      </p>
      <div className="relative">
        <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}
          className="press-3d rounded-lg bg-cream-50 px-3 py-1 text-xs font-bold text-wood-800 shadow-[0_3px_0_var(--color-cream-300)]">
          📜 진행 기록
        </button>
        {open ? (
          <div className="paper absolute right-0 top-9 z-30 w-72 p-3">
            <h3 className="mb-1 text-sm font-bold">진행 기록</h3>
            <ul className="space-y-0.5 text-sm text-stone-600">
              {log.length === 0 ? <li className="text-stone-400">아직 기록이 없어요.</li> : null}
              {log.map((line, index) => <li key={`${index}-${line}`}>{line}</li>)}
            </ul>
          </div>
        ) : null}
      </div>
      {log[0] ? <p className="w-full text-center text-xs text-cream-200/80">{log[0]}</p> : null}
    </div>
  );
}
