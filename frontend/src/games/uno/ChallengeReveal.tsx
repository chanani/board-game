import { useEffect } from 'react';
import type { UnoColor, UnoReveal } from '../../api/types';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/ui';
import { UnoCardFace } from './UnoCardFace';

const AUTO_CLOSE_MS = 5000;

type Props = { reveal: UnoReveal; name: string; highlightColor: UnoColor | null; onClose: () => void };

/** R22: 도전자에게만, 도전 처리 직후 한 번. 5초 뒤 저절로 닫힌다. */
export function ChallengeReveal({ reveal, name, highlightColor, onClose }: Props) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, AUTO_CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [onClose]);
  const verdict = reveal.guilty ? '지금 색 카드가 있었어요. 도전 성공!' : '지금 색 카드가 없었어요. 도전 실패…';
  return (
    <Modal open title={`${name}님의 카드`} onClose={onClose}>
      <h2 className="mb-3 pr-8 text-base font-black text-wood-800">{name}님의 카드</h2>
      <div className="flex flex-wrap gap-1.5">
        {reveal.cards.map((card) => {
          const highlight = highlightColor !== null && card.color === highlightColor;
          return (
            <span key={card.id} data-testid="reveal-card" data-highlight={highlight ? 'true' : undefined}
              className={`rounded-[6px] ${highlight ? 'ring-4 ring-yellow-300' : ''}`}>
              <UnoCardFace card={card} width={40} />
            </span>
          );
        })}
      </div>
      <p className="mt-3 text-sm font-bold text-wood-800">{verdict}</p>
      <div className="mt-4 flex justify-end"><Button onClick={onClose}>확인</Button></div>
    </Modal>
  );
}
