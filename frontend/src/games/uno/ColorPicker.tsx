import type { UnoColor } from '../../api/types';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/ui';
import { COLOR_HEX, COLOR_NAMES, COLOR_ORDER } from './cards';

type Props = {
  open: boolean;
  /** wild: 와일드를 낼 때(취소 가능). first: 첫 카드 WILD의 색 고르기(취소·닫기 없음). */
  mode: 'wild' | 'first';
  /** 와일드 +4인데 지금 색 카드를 갖고 있으면 경고한다. */
  risky: boolean;
  counts: Record<UnoColor, number>;
  onPick: (color: UnoColor) => void;
  onCancel: () => void;
};

export function ColorPicker({ open, mode, risky, counts, onPick, onCancel }: Props) {
  const title = mode === 'first' ? '첫 카드가 와일드예요. 색을 골라 주세요' : '색을 골라 주세요';
  return (
    <Modal open={open} title={title} onClose={mode === 'wild' ? onCancel : undefined}>
      <h2 className="mb-3 pr-8 text-base font-black text-wood-800">{title}</h2>
      {risky ? <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">지금 색 카드가 있어서, 도전받으면 내가 4장을 뽑아요.</p> : null}
      <div className="grid grid-cols-2 gap-3">
        {COLOR_ORDER.map((color) => (
          <button key={color} type="button" data-no-click-sound aria-label={`${COLOR_NAMES[color]}, 내 카드 ${counts[color]}장`} onClick={() => onPick(color)}
            className={`press-3d flex h-24 flex-col items-center justify-center rounded-2xl shadow-[0_4px_0_rgb(0_0_0/0.25)] ${color === 'YELLOW' ? 'text-wood-900' : 'text-white'}`}
            style={{ backgroundColor: COLOR_HEX[color] }}>
            <span className="text-lg font-black">{COLOR_NAMES[color]}</span>
            <span className="text-xs font-bold opacity-90">내 카드 {counts[color]}장</span>
          </button>
        ))}
      </div>
      {mode === 'wild' ? <div className="mt-4 flex justify-end"><Button variant="secondary" onClick={onCancel}>취소</Button></div> : null}
    </Modal>
  );
}
