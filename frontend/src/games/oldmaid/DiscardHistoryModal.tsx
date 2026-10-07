import type { OldMaidDiscard } from '../../api/types';
import { Modal } from '../../components/Modal';
import { PlayingCardFace } from './PlayingCardFace';

type Props = { open: boolean; discards: OldMaidDiscard[]; nicknameOf: (id: number) => string; onClose: () => void };

const CARD_WIDTH = 34;

/** 버린 카드 목록: 지금까지 버린 짝을 버린 순서대로 누가 버렸는지와 함께 보인다(모두에게 공개된 정보). */
export function DiscardHistoryModal({ open, discards, nicknameOf, onClose }: Props) {
  return (
    <Modal open={open} title="버린 카드" onClose={onClose}>
      <div className="space-y-3">
        <div className="pr-8">
          <h2 className="text-lg font-black text-wood-800">버린 카드</h2>
          <p className="text-xs text-stone-500">{discards.length > 0 ? `짝 ${discards.length}쌍 · 카드 ${discards.length * 2}장` : '버린 순서대로 보여요'}</p>
        </div>
        {discards.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-500">아직 버린 카드가 없어요</p>
        ) : (
          <ol data-testid="discard-history" className="max-h-[60vh] space-y-1.5 overflow-y-auto pr-1">
            {discards.map((discard, index) => (
              <li key={discard.cards.map((one) => one.id).join('-')} className="flex items-center gap-3 rounded-xl bg-cream-200/50 px-3 py-1.5">
                <span className="w-6 shrink-0 text-right text-xs font-bold tabular-nums text-stone-500">{index + 1}</span>
                <span className="flex shrink-0 gap-1">
                  {discard.cards.map((one) => <PlayingCardFace key={one.id} card={one} width={CARD_WIDTH} />)}
                </span>
                <span className="min-w-0 truncate text-sm font-bold text-wood-800">{nicknameOf(discard.playerId)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Modal>
  );
}
