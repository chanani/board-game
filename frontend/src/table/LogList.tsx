import type { ComponentType } from 'react';
import { chatTime } from '../lib/format';
import type { LogEntry, LogKind } from '../lib/eventLog';
import {
  CardsIcon, ClockIcon, ColorWheelIcon, DotIcon, EyeIcon, HandIcon, LogoutIcon, MedalIcon, PairIcon, PlayIcon, RecycleIcon, ReverseIcon,
  ScaleIcon, ShuffleIcon, SkipIcon, StarBubbleIcon, SwapIcon, ThiefMaskIcon, TrophyIcon, UndoIcon, UnoCardIcon,
} from '../components/icons';

export type Nickname = (memberId: number) => string;

const KIND_STYLE: Record<LogKind, { Icon: ComponentType<{ className?: string }>; bg: string }> = {
  'draw-deck': { Icon: CardsIcon, bg: 'bg-amber-100' },
  'draw-discard': { Icon: RecycleIcon, bg: 'bg-orange-100' },
  place: { Icon: SwapIcon, bg: 'bg-green-100' },
  undo: { Icon: UndoIcon, bg: 'bg-indigo-100' },
  peek: { Icon: EyeIcon, bg: 'bg-sky-100' },
  start: { Icon: PlayIcon, bg: 'bg-lime-100' },
  result: { Icon: TrophyIcon, bg: 'bg-yellow-100' },
  timeout: { Icon: ClockIcon, bg: 'bg-rose-100' },
  leave: { Icon: LogoutIcon, bg: 'bg-stone-300' },
  other: { Icon: DotIcon, bg: 'bg-stone-200' },
  play: { Icon: UnoCardIcon, bg: 'bg-red-100' },
  skip: { Icon: SkipIcon, bg: 'bg-orange-100' },
  reverse: { Icon: ReverseIcon, bg: 'bg-violet-100' },
  color: { Icon: ColorWheelIcon, bg: 'bg-teal-100' },
  challenge: { Icon: ScaleIcon, bg: 'bg-fuchsia-100' },
  uno: { Icon: StarBubbleIcon, bg: 'bg-yellow-200' },
  catch: { Icon: HandIcon, bg: 'bg-rose-200' },
  reshuffle: { Icon: ShuffleIcon, bg: 'bg-cyan-100' },
  pair: { Icon: PairIcon, bg: 'bg-emerald-100' },
  shuffle: { Icon: ShuffleIcon, bg: 'bg-sky-100' },
  finish: { Icon: MedalIcon, bg: 'bg-amber-100' },
  thief: { Icon: ThiefMaskIcon, bg: 'bg-rose-200' },
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

/** 진행 기록 목록. 팝오버와 대화상자가 함께 쓴다. */
export function LogList({ log, nicknameOf, className }: { log: LogEntry[]; nicknameOf?: Nickname; className: string }) {
  return (
    <ul className={`scroll-thin overflow-y-auto pr-1 text-sm text-stone-600 ${className}`}>
      {log.length === 0 ? <li className="text-stone-400">아직 기록이 없어요.</li> : null}
      {log.map((entry) => (
        <li key={entry.id} className="flex items-center gap-2 border-b border-dashed border-cream-300 py-1.5 text-xs last:border-b-0">
          <KindDot kind={entry.kind} />
          <span className="min-w-0 flex-1"><Sentence entry={entry} nicknameOf={nicknameOf} /></span>
          <time dateTime={iso(entry.at)} className="shrink-0 text-[10px] text-stone-500">{chatTime(iso(entry.at))}</time>
        </li>
      ))}
    </ul>
  );
}
