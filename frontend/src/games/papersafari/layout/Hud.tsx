import { useState } from 'react';

type Props = { roundNumber: number; instruction: string; myTurn: boolean; log: string[]; compact?: boolean };

/**
 * compact(PC가 아닌 배치)에서는 라운드·안내·기록 버튼을 한 줄 격자에 고정해, 안내 문구 길이에 따라 줄바꿈이 달라지지 않게 한다.
 * 마지막 기록 줄도 비어 있을 때부터 한 줄 높이를 잡아 두어 첫 기록이 생길 때 아래 화면이 밀리지 않는다.
 */
export function Hud({ roundNumber, instruction, myTurn, log, compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const frame = compact ? 'grid grid-cols-[auto_minmax(0,1fr)_auto]' : 'flex flex-wrap justify-between';
  return (
    <div data-testid="hud" className={`${frame} items-center gap-2`}>
      <span className="rounded-lg bg-black/35 px-3 py-1 text-sm font-bold text-cream-50">🦁 {roundNumber}라운드</span>
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
            <ul className="space-y-0.5 text-sm text-stone-600">
              {log.length === 0 ? <li className="text-stone-400">아직 기록이 없어요.</li> : null}
              {log.map((line, index) => <li key={`${index}-${line}`}>{line}</li>)}
            </ul>
          </div>
        ) : null}
      </div>
      <p data-testid="last-log" className="col-span-full h-4 w-full truncate text-center text-xs leading-4 text-cream-200/80">{log[0] ?? ''}</p>
    </div>
  );
}
