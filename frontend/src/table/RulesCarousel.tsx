import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react';
import { Modal } from '../components/Modal';
import type { RuleSlideBase } from '../games/gameModule';

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  slides: RuleSlideBase[];
  /** 슬라이드 아래 그림(카드 등). 게임마다 다르다. */
  renderArt: (slide: RuleSlideBase) => ReactNode;
};

const SWIPE_PX = 50;
const OFFSET_PX = 40;
const NAV = 'press-3d rounded-lg px-3 py-1.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none';

export function RulesCarousel({ open, onClose, title, slides, renderArt }: Props) {
  const last = slides.length - 1;
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const slide = slides[index];

  const goTo = (next: number) => {
    const clamped = Math.min(last, Math.max(0, next));
    setDirection(clamped >= index ? 1 : -1);
    setIndex(clamped);
  };

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        goTo(index + 1);
      }
      if (event.key === 'ArrowLeft') {
        goTo(index - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, index]);

  useEffect(() => {
    if (open) {
      setIndex(0);
    }
  }, [open]);

  const handleTouchStart = (event: TouchEvent) => {
    touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  };

  const handleTouchEnd = (event: TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (start === null) {
      return;
    }
    const delta = event.changedTouches[0].clientX - start.x;
    const vertical = Math.abs(event.changedTouches[0].clientY - start.y);
    if (Math.abs(delta) < SWIPE_PX || vertical > Math.abs(delta)) {
      return;
    }
    goTo(delta < 0 ? index + 1 : index - 1);
  };

  return (
    <Modal open={open} title={title} onClose={onClose} wide>
      <h2 className="mb-3 pr-8 text-base font-black text-wood-800 sm:text-lg">{title}</h2>
      <div className="min-h-[18rem] overflow-hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
        onTouchCancel={() => { touchStart.current = null; }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={index}
            initial={{ opacity: 0, x: direction * OFFSET_PX }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -direction * OFFSET_PX }}
            transition={{ duration: 0.18 }}>
            <h3 className="mb-3 text-base font-bold text-wood-800 sm:text-xl">{index + 1}. {slide.title}</h3>
            <ul className="mb-4 list-disc space-y-1.5 pl-5 text-sm text-stone-700 sm:text-base">
              {slide.body.map((line) => <li key={line}>{line}</li>)}
            </ul>
            <div className="flex flex-wrap justify-center gap-3">
              {renderArt(slide)}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt-4 flex items-end justify-between gap-2">
        <button type="button" onClick={() => goTo(index - 1)} disabled={index === 0} className={`${NAV} bg-cream-50 text-wood-800 shadow-[0_3px_0_var(--color-cream-300)] hover:bg-white`}>이전</button>
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-xs font-bold text-stone-600">{index + 1} / {slides.length}</span>
          <div className="flex gap-2">
            {slides.map((item, i) => (
              <button key={item.title} type="button" aria-label={`${i + 1}번째 설명`} aria-current={i === index ? 'step' : undefined}
                onClick={() => goTo(i)}
                className={`h-2.5 w-2.5 rounded-full sm:h-3 sm:w-3 ${i === index ? 'bg-wood-800' : 'bg-stone-300'}`} />
            ))}
          </div>
        </div>
        <button type="button" onClick={() => goTo(index + 1)} disabled={index === last} className={`${NAV} bg-mustard-400 text-wood-800 shadow-[0_3px_0_var(--color-mustard-600)] hover:bg-mustard-300`}>다음</button>
      </div>
    </Modal>
  );
}
