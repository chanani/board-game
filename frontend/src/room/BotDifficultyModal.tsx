import type { BotDifficulty } from '../api/types';
import { Modal } from '../components/Modal';
import { Button } from '../components/ui';
import { BOT_DIFFICULTIES, DIFFICULTY_BUTTON, DIFFICULTY_NOTE } from '../lib/bots';

type Props = { open: boolean; title: string; current?: BotDifficulty | null; onPick: (difficulty: BotDifficulty) => void; onClose: () => void };

/** 컴퓨터를 추가하거나 난이도를 바꿀 때 하·중·상을 고르는 창. 배경·Esc로 닫으면 아무것도 하지 않는다. */
export function BotDifficultyModal({ open, title, current, onPick, onClose }: Props) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <h2 className="pr-8 text-lg font-bold text-wood-800">{title}</h2>
        <div className="flex flex-col gap-2">
          {BOT_DIFFICULTIES.map((difficulty) => (
            <Button key={difficulty} variant={difficulty === current ? 'primary' : 'secondary'} aria-label={DIFFICULTY_BUTTON[difficulty]}
              onClick={() => onPick(difficulty)} className="flex flex-col items-start gap-0.5 text-left">
              <span>{DIFFICULTY_BUTTON[difficulty]}</span>
              <span className="text-xs font-normal opacity-80">{DIFFICULTY_NOTE[difficulty]}</span>
            </Button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
