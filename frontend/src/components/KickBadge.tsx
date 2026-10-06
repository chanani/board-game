import { CloseIcon } from './icons';

/** 모바일 내보내기: 지름 20px 빨간 동그라미 X, 누르는 영역은 32px. 위치는 쓰는 쪽이 className으로 정한다. */
export function KickBadge({ label, onClick, className = '' }: { label: string; onClick: () => void; className?: string }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className={`grid h-8 w-8 place-items-center ${className}`}>
      <span className="grid h-5 w-5 place-items-center rounded-full border-2 border-cream-50 bg-red-700 text-white shadow-[0_2px_0_rgb(0_0_0/0.35)]">
        <CloseIcon className="h-2.5 w-2.5" />
      </span>
    </button>
  );
}
