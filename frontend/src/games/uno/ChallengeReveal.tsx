import { useEffect } from 'react';
import type { UnoReveal } from '../../api/types';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/ui';
import { challengeVerdictText } from './describe';
import { UnoCardFace } from './UnoCardFace';

const AUTO_CLOSE_MS = 5000;

type Props = { reveal: UnoReveal; name: string; challengerName: string; onClose: () => void };

/**
 * R22: 도전자에게만, 도전 처리 직후 한 번. 5초 뒤 저절로 닫힌다.
 * 판정 기준인 +4 직전의 색 카드만 강조하고 나머지는 흐리게 해 왜 성공·실패했는지 바로 보이게 한다.
 */
export function ChallengeReveal({ reveal, name, challengerName, onClose }: Props) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, AUTO_CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [onClose]);
  const basis = reveal.previousColor;
  const verdict = challengeVerdictText(reveal.guilty, name, challengerName, basis);
  return (
    <Modal open title={`${name}님의 카드`} onClose={onClose}>
      <h2 className="mb-3 pr-8 text-base font-black text-wood-800">{name}님의 카드</h2>
      <div className="flex flex-wrap gap-1.5">
        {reveal.cards.map((card) => {
          const highlight = basis !== null && card.color === basis;
          const dim = basis !== null && !highlight;
          return (
            <span key={card.id} data-testid="reveal-card" data-highlight={highlight ? 'true' : undefined} data-dim={dim ? 'true' : undefined}
              className={`rounded-[6px] transition-opacity ${highlight ? 'ring-4 ring-yellow-300' : ''} ${dim ? 'opacity-40' : ''}`}>
              <UnoCardFace card={card} width={40} />
            </span>
          );
        })}
      </div>
      <p data-testid="reveal-verdict" className="mt-3 text-sm font-bold text-wood-800">{verdict}</p>
      <div className="mt-4 flex justify-end"><Button onClick={onClose}>확인</Button></div>
    </Modal>
  );
}
