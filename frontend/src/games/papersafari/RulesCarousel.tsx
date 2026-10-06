import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type TouchEvent } from 'react';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/ui';
import { CardFace } from './CardFace';
import { RULE_SLIDES } from './rules';

type Props = { open: boolean; onClose: () => void };

const LAST = RULE_SLIDES.length - 1;
const SWIPE_PX = 50;
const OFFSET_PX = 40;

export function RulesCarousel({ open, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const touchX = useRef<number | null>(null);
  const slide = RULE_SLIDES[index];

  const goTo = (next: number) => {
    const clamped = Math.min(LAST, Math.max(0, next));
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
  });

  useEffect(() => {
    if (open) {
      setIndex(0);
    }
  }, [open]);

  const handleTouchStart = (event: TouchEvent) => {
    touchX.current = event.touches[0].clientX;
  };

  const handleTouchEnd = (event: TouchEvent) => {
    if (touchX.current === null) {
      return;
    }
    const delta = event.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(delta) < SWIPE_PX) {
      return;
    }
    goTo(delta < 0 ? index + 1 : index - 1);
  };

  return (
    <Modal open={open} title="페이퍼 사파리 규칙" onClose={onClose} wide>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-black text-wood-800">페이퍼 사파리 규칙</h2>
        <span className="text-sm font-bold text-stone-600">{index + 1} / {RULE_SLIDES.length}</span>
      </div>
      <div className="min-h-[18rem] overflow-hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={index}
            initial={{ opacity: 0, x: direction * OFFSET_PX }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -direction * OFFSET_PX }}
            transition={{ duration: 0.18 }}>
            <h3 className="mb-3 text-xl font-bold text-wood-800">{index + 1}. {slide.title}</h3>
            <ul className="mb-4 list-disc space-y-1.5 pl-5 text-stone-700">
              {slide.body.map((line) => <li key={line}>{line}</li>)}
            </ul>
            <div className="flex flex-wrap justify-center gap-3">
              {slide.cards.map((card, i) => <CardFace key={i} card={card} faceUp known size="md" />)}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <Button variant="secondary" onClick={() => goTo(index - 1)} disabled={index === 0}>이전</Button>
        <div className="flex gap-2">
          {RULE_SLIDES.map((item, i) => (
            <button key={item.title} type="button" aria-label={`${i + 1}번째 설명`} aria-current={i === index ? 'step' : undefined}
              onClick={() => goTo(i)}
              className={`h-3 w-3 rounded-full ${i === index ? 'bg-wood-800' : 'bg-stone-300'}`} />
          ))}
        </div>
        <Button onClick={() => goTo(index + 1)} disabled={index === LAST}>다음</Button>
      </div>
      <div className="mt-4 text-center">
        <button type="button" onClick={onClose} className="text-sm text-stone-500 underline">닫기</button>
      </div>
    </Modal>
  );
}
