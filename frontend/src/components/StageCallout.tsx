import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

type Props = {
  /** 바뀔 때마다 큰 글자가 새로 튀어나온다(3 → 2 → 1). */
  shoutKey: string | number;
  /** 가운데 큰 글자(숫자나 "게임 끝!"). */
  shout: ReactNode;
  /** 큰 글자 위 알약 안내. */
  above?: string;
  /** 큰 글자 아래 알약 안내. */
  below?: string;
  /** number: 한두 글자 숫자라 아주 크게, text: 글자가 길어 한 줄에 들어가게. */
  size?: 'number' | 'text';
  label: string;
  testId: string;
  shoutTestId?: string;
  /** danger: 붉은 글자·테두리에 더 어두운 바탕(도둑잡기 서든데스). */
  tone?: 'default' | 'danger';
};

const TONES = {
  default: { shout: 'text-mustard-300', pill: 'border-mustard-400 text-mustard-200', backdrop: 'bg-black/35' },
  danger: { shout: 'text-rose-500', pill: 'border-rose-500 text-rose-100', backdrop: 'bg-black/55' },
};

const SHOUT_SIZES = {
  number: 'h-44 w-44 text-[9rem] sm:h-56 sm:w-56 sm:text-[12rem]',
  text: 'h-28 px-2 text-6xl sm:h-36 sm:text-8xl',
};

function Pill({ children, tone }: { children: string; tone: string }) {
  return (
    <p className={`rounded-full border-2 ${tone} bg-black/55 px-4 py-1 text-sm font-black tracking-wide sm:text-base`}>
      {children}
    </p>
  );
}

/**
 * 게임 시작 카운트다운과 게임 끝 알림이 함께 쓰는, 화면 가운데 큰 글자 알림. 방 안 모두가 같은 모습으로 본다.
 * 화면을 막지 않아 그동안에도 나가기·채팅을 쓸 수 있다. 바깥의 AnimatePresence 안에 두면 사라질 때도 흐려진다.
 */
export function StageCallout({ shoutKey, shout, above, below, size = 'number', label, testId, shoutTestId, tone = 'default' }: Props) {
  const reduced = useReducedMotion();
  const colors = TONES[tone];
  return (
    <motion.div
      role="status"
      aria-live="assertive"
      aria-label={label}
      data-testid={testId}
      className={`pointer-events-none fixed inset-0 z-40 grid place-items-center ${colors.backdrop} px-4 backdrop-blur-[2px]`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex flex-col items-center gap-2">
        {above ? <Pill tone={colors.pill}>{above}</Pill> : null}
        <div className={`relative grid place-items-center ${SHOUT_SIZES[size]}`}>
          <AnimatePresence mode="wait">
            <motion.span
              key={shoutKey}
              data-testid={shoutTestId}
              className={`whitespace-nowrap font-black leading-none ${colors.shout} drop-shadow-[0_6px_0_rgb(0_0_0_/_0.45)]`}
              initial={reduced ? { opacity: 0 } : { scale: 1.9, opacity: 0 }}
              animate={reduced ? { opacity: 1 } : { scale: 1, opacity: 1 }}
              exit={reduced ? { opacity: 0 } : { scale: 0.5, opacity: 0, transition: { duration: 0.15 } }}
              transition={reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 380, damping: 18 }}
            >
              {shout}
            </motion.span>
          </AnimatePresence>
        </div>
        {below ? <Pill tone={colors.pill}>{below}</Pill> : null}
      </div>
    </motion.div>
  );
}
