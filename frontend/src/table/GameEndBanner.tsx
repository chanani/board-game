import { motion } from 'motion/react';

/** 결과 창 전에 테이블 가운데 잠깐 떴다 사라지는 "게임 끝!" 배너. 아랫줄은 게임마다 다르다(점수가 없는 도둑잡기는 순위). */
export function GameEndBanner({ subtitle = '점수를 계산하고 있어요' }: { subtitle?: string }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center px-4">
      <motion.div
        role="status"
        data-testid="game-end-banner"
        className="rounded-2xl border-2 border-mustard-400 bg-black/55 px-7 py-3.5 text-center shadow-2xl backdrop-blur-[2px]"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: [0, 1, 1, 0] }}
        transition={{
          scale: { type: 'spring', stiffness: 420, damping: 16 },
          opacity: { duration: 1.3, times: [0, 0.12, 0.85, 1] },
        }}
      >
        <p className="text-3xl font-black tracking-wide text-mustard-200">게임 끝!</p>
        <p className="mt-1 text-xs font-bold text-cream-200">{subtitle}</p>
      </motion.div>
    </div>
  );
}
