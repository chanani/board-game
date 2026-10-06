import { motion } from 'motion/react';
import { useState } from 'react';
import type { CatalogEntry } from './catalog';
import { gameOf } from './registry';
import { LockIcon } from '../components/icons';

type Props = { entry?: CatalogEntry; name: string; onOpen?: () => void };

const OPEN_MS = 380;

export function GameBox({ entry, name, onOpen }: Props) {
  const [opening, setOpening] = useState(false);
  const available = Boolean(entry && onOpen);
  const BoxArt = entry ? gameOf(entry.gameType).BoxArt : null;

  const open = () => {
    if (!onOpen || opening) {
      return;
    }
    setOpening(true);
    window.setTimeout(onOpen, OPEN_MS);
  };

  return (
    <motion.button
      type="button"
      aria-label={available ? `${name} 열기` : '준비 중인 게임'}
      disabled={!available}
      onClick={open}
      className="group relative h-[150px] w-[120px] [perspective:700px] disabled:cursor-not-allowed"
      initial={{ y: -30, opacity: 0 }}
      animate={opening ? { scale: 1.25, y: -20, opacity: 0 } : { y: 0, opacity: 1 }}
      transition={{ duration: opening ? OPEN_MS / 1000 : 0.4 }}
    >
      <span className="absolute inset-0 transition-transform duration-200 [transform-style:preserve-3d] [transform:rotateY(-14deg)] group-enabled:group-hover:[transform:rotateY(-4deg)_rotateX(6deg)_translateZ(10px)]">
        <span className="absolute inset-0 overflow-hidden rounded-[4px] shadow-[10px_8px_18px_rgb(0_0_0/0.55)]">
          {available && BoxArt ? <BoxArt /> : <ComingSoonFace />}
        </span>
        <span className={`absolute right-[-16px] top-0 h-full w-4 origin-left [transform:rotateY(90deg)] brightness-[.6] ${available ? 'bg-[#f6c66e]' : 'bg-stone-600'}`} />
        <span className="absolute left-0 top-[-12px] h-3 w-full origin-bottom [transform:rotateX(90deg)] bg-cream-200 brightness-90" />
      </span>
    </motion.button>
  );
}

function ComingSoonFace() {
  return (
    <span className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-b from-stone-500 to-stone-700 text-sm font-bold text-stone-200">
      <LockIcon className="h-7 w-7" />
      곧 추가돼요
    </span>
  );
}
