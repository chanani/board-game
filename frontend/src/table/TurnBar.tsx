import { useState } from 'react';
import type { LogEntry } from '../lib/eventLog';
import { Countdown } from '../components/Countdown';
import { KindDot, Sentence } from './LogList';
import { ChevronRightIcon, PlayIcon } from '../components/icons';
import { LogModal } from './LogModal';

type Props = {
  instruction: string;
  myTurn: boolean;
  log: LogEntry[];
  nicknameOf?: (memberId: number) => string;
  deadline: number | null | undefined;
  serverNow: number | undefined;
  onWarn?: () => void;
  /** 게임 끝 연출처럼 테이블이 잠긴 동안: 열려 있던 진행 기록 창을 닫는다. */
  locked?: boolean;
  /** PC가 아닌 배치: 글씨 text-xs, 패딩을 줄인다. */
  compact?: boolean;
  /** 휴대폰을 눕힌 화면의 왼쪽 좁은 칸: 문구·타이머·최근 진행을 세로로 쌓고 문구는 줄바꿈한다. */
  stacked?: boolean;
};

/**
 * 차례 문구 + 카운트다운 + 최근 진행 내역을 한 줄에 둔다. 줄바꿈 없이 높이를 고정하고, 넘치면 진행 내역부터 말줄임한다.
 * 펠트의 나무 테두리(box-shadow 13px)는 레이아웃에 잡히지 않으므로 PC는 mb-8(보이는 간격 19px)로 테이블과 띄운다.
 */
export function TurnBar({ instruction, myTurn, log, nicknameOf, deadline, serverNow, onWarn, locked = false, compact = false, stacked = false }: Props) {
  const size = compact ? 'mb-4 h-8 gap-1.5 px-2 text-xs' : 'mb-8 h-10 gap-2 px-4 text-sm';
  const shape = stacked ? 'flex-col items-start gap-1 px-2.5 py-2 text-xs' : `flex-nowrap items-center justify-center whitespace-nowrap ${size}`;
  const tone = myTurn ? 'turn-glow border-transparent bg-(--accent) text-(--accent-text)' : 'border-(--status-border) bg-(--status-bg) text-cream-50';
  const latest = log[0];
  const [open, setOpen] = useState(false);
  if (locked && open) {
    setOpen(false);
  }
  const line = latest ? (
    <>
      <span aria-hidden="true" className="mr-1">·</span>
      <span className="mr-1 inline-flex align-[-3px]"><KindDot kind={latest.kind} small /></span>
      <Sentence entry={latest} nicknameOf={nicknameOf} />
    </>
  ) : null;
  return (
    <>
      <div data-testid="turn-bar"
        className={`flex overflow-hidden rounded-xl border backdrop-blur-[2px] ${tone} ${shape}`}>
        {myTurn ? (
          <span data-testid="my-turn-badge"
            className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-(--accent-text) px-2 py-0.5 text-[11px] font-black leading-none text-(--accent) shadow-[0_1px_0_rgb(0_0_0/0.25)]">
            <PlayIcon className="h-3 w-3" />내 차례
          </span>
        ) : null}
        <p role="status" data-testid="instruction" className="flex min-w-0 shrink items-center font-bold">
          <span className={stacked ? 'break-keep' : 'truncate'}>{instruction}</span>
        </p>
        <Countdown deadline={deadline} serverNow={serverNow} onWarn={onWarn} />
        <p data-testid="last-log" className={`min-w-0 shrink-[3] truncate opacity-85 ${stacked ? 'max-w-full whitespace-nowrap' : ''}`}>
          {line ? (
            <button type="button" aria-label="진행 기록 보기" onClick={() => setOpen(true)} className="inline-flex max-w-full cursor-pointer items-center rounded underline decoration-dotted underline-offset-2 opacity-90 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-current"><span className="min-w-0 truncate">{line}</span><ChevronRightIcon className="ml-0.5 h-3 w-3 shrink-0" /></button>
          ) : null}
        </p>
      </div>
      <LogModal open={open} onClose={() => setOpen(false)} log={log} nicknameOf={nicknameOf} />
    </>
  );
}
