import { useEffect, useRef, useState } from 'react';

type Props = {
  /** 마감 시각(서버 시계, epoch ms). null이면 기다리는 행동이 없다. */
  deadline: number | null | undefined;
  /** 서버가 화면을 만든 시각(서버 시계). deadline에서 빼서 클라이언트 시계와의 차이를 없앤다. */
  serverNow: number | undefined;
  /** 처음 5초 이하가 되는 순간 마감마다 한 번 부른다(내 차례 경고음). */
  onWarn?: () => void;
  /** sm: 이름표 옆 작은 크기. */
  size?: 'sm' | 'md';
  className?: string;
};

const SIZES = { sm: 'h-5 w-5 text-[10px]', md: 'h-6 w-6 text-[11px]' };

const SHOW_MS = 5000;
const TICK_MS = 250;
const RADIUS = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type Anchor = { deadline: number | null | undefined; serverNow: number | undefined; at: number };

/** 받은 시점의 로컬 시각을 기준으로, 남은 시간 = (deadline - serverNow) - 받은 뒤 흐른 시간. */
export function useRemaining(deadline: number | null | undefined, serverNow: number | undefined): number | null {
  const [anchor, setAnchor] = useState<Anchor>(() => ({ deadline, serverNow, at: Date.now() }));
  const [now, setNow] = useState(() => Date.now());
  const changed = anchor.deadline !== deadline || anchor.serverNow !== serverNow;
  if (changed) {
    const at = Date.now();
    setAnchor({ deadline, serverNow, at });
    setNow(at);
  }
  const active = deadline !== null && deadline !== undefined && serverNow !== undefined;
  const remaining = active ? Math.max(0, deadline - serverNow - (now - anchor.at)) : null;
  const running = remaining !== null && remaining > 0;

  useEffect(() => {
    if (!running) {
      return undefined;
    }
    const timer = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(timer);
  }, [running, deadline, serverNow]);

  return changed ? null : remaining;
}

/** 남은 시간이 5초 이하일 때만 숫자와 줄어드는 링을 보인다. 0에서 멈춘다. */
export function Countdown({ deadline, serverNow, onWarn, size = 'md', className = '' }: Props) {
  const remaining = useRemaining(deadline, serverNow);
  const visible = remaining !== null && remaining <= SHOW_MS;
  const warnedFor = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    if (!visible || remaining === 0 || warnedFor.current === deadline) {
      return;
    }
    warnedFor.current = deadline;
    onWarn?.();
  }, [visible, remaining, deadline, onWarn]);

  if (!visible || remaining === null) {
    return null;
  }
  const seconds = Math.ceil(remaining / 1000);
  const offset = CIRCUMFERENCE * (1 - remaining / SHOW_MS);
  return (
    <span data-testid="countdown" role="timer" aria-label={`${seconds}초 남았어요`}
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full bg-(--timer-bg) font-black leading-none text-(--timer-ink) shadow ${SIZES[size]} ${className}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="absolute inset-0 h-full w-full -rotate-90">
        <circle cx="12" cy="12" r={RADIUS} fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
        <circle cx="12" cy="12" r={RADIUS} fill="none" stroke="var(--timer-ring)" strokeWidth="2" strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-250 ease-linear motion-reduce:transition-none" />
      </svg>
      <span aria-hidden="true" className="relative">{seconds}</span>
    </span>
  );
}
