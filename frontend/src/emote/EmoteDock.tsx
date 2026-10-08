import { useRef, useState } from 'react';
import { EmoteBubble } from './EmoteBubble';
import { EmotePanel, type PanelAlign } from './EmotePanel';
import { useEmotes } from './useRoomEmotes';

/** 웃는 얼굴 선 아이콘(icons.tsx와 같은 24px 선 그림). */
function SmileLineIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" />
      <path d="M9 9.5h.01M15 9.5h.01" strokeWidth="2.6" />
    </svg>
  );
}

/** 우노·도둑잡기 내 손패 칸(relative)의 왼쪽 위 모서리. 리본·행동 버튼은 가운데에 있어 겹치지 않는다. */
export const EMOTE_DOCK = '-top-3 left-1';

type Props = {
  meId: number;
  /** 감싼(relative) 내 자리 안에서의 위치. */
  className: string;
  /** 패널을 버튼의 어느 쪽 끝에 맞춰 펼칠지(화면 밖으로 나가지 않게). */
  align?: PanelAlign;
};

/**
 * 게임 중 내 자리 모서리의 작은 "감정 표현하기" 버튼. 누르면 위로 표정 패널이 열리고, 내가 보낸 표정은 버튼 위에 뜬다.
 * 카드 누르기와 겹치지 않게 내 자리(손패·판) 모서리에 떠 있는 따로 된 버튼이다. 방 화면 밖에서는 그리지 않는다.
 */
export function EmoteDock(props: Props) {
  return useEmotes() ? <Dock {...props} /> : null;
}

function Dock({ meId, className, align = 'start' }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} data-testid="emote-dock" className={`absolute z-30 ${className}`}>
      <EmoteBubble memberId={meId} className="absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2" />
      <button type="button" aria-label="감정 표현하기" aria-expanded={open} onClick={() => setOpen((current) => !current)}
        className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full shadow-[0_2px_0_rgb(0_0_0/0.3)] outline-none transition-transform hover:scale-110 focus-visible:ring-[3px] focus-visible:ring-mustard-300 motion-reduce:transition-none motion-reduce:hover:scale-100 ${open ? 'bg-mustard-300 text-wood-900' : 'bg-cream-50 text-wood-800'}`}>
        <SmileLineIcon />
      </button>
      {open ? <EmotePanel anchorRef={ref} onClose={() => setOpen(false)} placement="up" align={align} /> : null}
    </div>
  );
}
