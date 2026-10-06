import type { ReactNode } from 'react';

type IconProps = { className?: string; testId?: string };

function Svg({ className, testId, children }: IconProps & { children: ReactNode }) {
  return (
    <svg data-testid={testId} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className ?? 'h-5 w-5'} aria-hidden="true">
      {children}
    </svg>
  );
}

export const SpeakerIcon = ({ className }: IconProps) => (
  <Svg className={className}><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16.5 8.5a5 5 0 0 1 0 7" /><path d="M19 6a8.5 8.5 0 0 1 0 12" /></Svg>
);

export const SpeakerMutedIcon = ({ className }: IconProps) => (
  <Svg className={className}><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M17 9l5 6" /><path d="M22 9l-5 6" /></Svg>
);

export const RefreshIcon = ({ className }: IconProps) => (
  <Svg className={className}><path d="M20 11a8 8 0 0 0-14.5-4.5L4 8" /><path d="M4 4v4h4" /><path d="M4 13a8 8 0 0 0 14.5 4.5L20 16" /><path d="M20 20v-4h-4" /></Svg>
);

export const BookIcon = ({ className }: IconProps) => (
  <Svg className={className}><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5v-15z" /><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5v-15z" /></Svg>
);

export const EyeIcon = ({ className }: IconProps) => (
  <Svg className={className}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></Svg>
);

export const LockIcon = ({ className }: IconProps) => (
  <Svg className={className}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Svg>
);

export const UndoIcon = ({ className }: IconProps) => (
  <Svg className={className}><path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></Svg>
);

export const CloseIcon = ({ className }: IconProps) => (
  <Svg className={className}><path d="M6 6l12 12" /><path d="M18 6L6 18" /></Svg>
);

export const PlusIcon = ({ className }: IconProps) => (
  <Svg className={className}><path d="M12 5v14" /><path d="M5 12h14" /></Svg>
);

export const DoorIcon = ({ className }: IconProps) => (
  <Svg className={className}><path d="M4 21h16" /><path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17" /><path d="M14 12h.01" /></Svg>
);

export const ChatIcon = ({ className }: IconProps) => (
  <Svg className={className}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /><path d="M8.5 12h.01" /><path d="M12 12h.01" /><path d="M15.5 12h.01" /></Svg>
);

export const BinocularsIcon = ({ className }: IconProps) => (
  <Svg className={className ?? 'h-3.5 w-3.5'}><circle cx="7" cy="15" r="4" /><circle cx="17" cy="15" r="4" /><path d="M7 11V6h4M17 11V6h-4M11 15h2" /></Svg>
);

/** 승자 위에 띄우는 리본 메달. 색을 직접 지정해 테마와 무관하게 금메달로 보인다. */
export const MedalIcon = ({ className }: IconProps) => (
  <svg data-testid="result-medal" viewBox="0 0 24 24" className={className ?? 'h-[34px] w-[34px]'} aria-hidden="true">
    <path d="M8 2h8l-2 6h-4z" fill="#b4461a" />
    <circle cx="12" cy="14" r="7" fill="#f2b33d" stroke="#b77b14" strokeWidth="1.5" />
    <path d="M12 10.5l1.1 2.2 2.4.3-1.8 1.7.5 2.4-2.2-1.2-2.2 1.2.5-2.4-1.8-1.7 2.4-.3z" fill="#fffaf0" />
  </svg>
);

/** 무승부용 회색 메달(리본·별 없이 담백하게). */
export const DrawIcon = ({ className }: IconProps) => (
  <svg data-testid="result-draw" viewBox="0 0 24 24" className={className ?? 'h-[34px] w-[34px]'} aria-hidden="true">
    <path d="M8 2h8l-2 6h-4z" fill="#a8a29e" />
    <circle cx="12" cy="14" r="7" fill="#d6d3d1" stroke="#78716c" strokeWidth="1.5" />
    <path d="M8.5 12.5h7M8.5 15.5h7" stroke="#57534e" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const CardsIcon = ({ className }: IconProps) => (
  <Svg className={className ?? 'h-3.5 w-3.5'}><rect x="3" y="6" width="11" height="15" rx="2" /><path d="M8 3h11a2 2 0 0 1 2 2v13" /></Svg>
);

export const PeopleIcon = ({ className }: IconProps) => (
  <Svg className={className ?? 'h-3.5 w-3.5'}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7" /><path d="M18 14a6.5 6.5 0 0 1 3.5 6" /></Svg>
);

export const CopyIcon = ({ className }: IconProps) => (
  <Svg className={className ?? 'h-3.5 w-3.5'}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></Svg>
);

export const ScrollIcon = ({ className }: IconProps) => (
  <Svg className={className ?? 'h-4 w-4'}><path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8" /><path d="M6 4a2 2 0 0 0-2 2v2h4V6a2 2 0 0 0-2-2z" /><path d="M8 20a2 2 0 0 1-2-2V8" /><path d="M10 9h6M10 13h6M10 17h3" /></Svg>
);

export const ChevronRightIcon = ({ className }: IconProps) => (
  <Svg className={className ?? 'h-4 w-4'}><path d="m9 6 6 6-6 6" /></Svg>
);

export const LogoutIcon = ({ className }: IconProps) => (
  <Svg className={className ?? 'h-4 w-4'}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 16l-4-4 4-4" /><path d="M6 12h10" /></Svg>
);

export const GridIcon = ({ className }: IconProps) => (
  <Svg className={className ?? 'h-4 w-4'}><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></Svg>
);

export const TrophyIcon = ({ className }: IconProps) => (
  <Svg className={className ?? 'h-4 w-4'}><path d="M8 4h8v5a4 4 0 0 1-8 0V4z" /><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4" /><path d="M12 13v4M8 20h8M10 17h4" /></Svg>
);

export const RecycleIcon = ({ className }: IconProps) => (
  <Svg className={className}><path d="M4 12a8 8 0 0 1 13.5-5.8L20 8.5" /><path d="M20 4v4.5h-4.5" /><path d="M20 12a8 8 0 0 1-13.5 5.8L4 15.5" /><path d="M4 20v-4.5h4.5" /></Svg>
);

export const SwapIcon = ({ className }: IconProps) => (
  <Svg className={className}><path d="M4 8h14l-4-4" /><path d="M20 16H6l4 4" /></Svg>
);

export const PlayIcon = ({ className }: IconProps) => (
  <Svg className={className}><path d="M7 4.5v15l12-7.5z" /></Svg>
);

export const ClockIcon = ({ className }: IconProps) => (
  <Svg className={className}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Svg>
);

export const DotIcon = ({ className }: IconProps) => (
  <Svg className={className}><circle cx="12" cy="12" r="3" fill="currentColor" /></Svg>
);

export const CrownIcon = ({ className, testId }: IconProps) => (
  <Svg testId={testId} className={className ?? 'h-3.5 w-3.5'}><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" /></Svg>
);

export const CheckIcon = ({ className, testId }: IconProps) => (
  <Svg testId={testId} className={className ?? 'h-3.5 w-3.5'}><path d="M5 12.5l4.5 4.5L19 7" /></Svg>
);

/** 엿본 카드 표시: 돋보기 + 카드 모서리. */
export const PeekIcon = ({ className, testId }: IconProps) => (
  <Svg testId={testId} className={className ?? 'h-3.5 w-3.5'}><path d="M13 3H6a2 2 0 0 0-2 2v12" /><path d="M8 7h5" /><circle cx="14" cy="14" r="4.5" /><path d="M17.5 17.5L21 21" /></Svg>
);

export const DiceIcon = ({ className }: IconProps) => (
  <Svg className={className ?? 'h-4 w-4'}><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01" /></Svg>
);

export const HourglassIcon = ({ className }: IconProps) => (
  <Svg className={className ?? 'h-3.5 w-3.5'}><path d="M6 3h12M6 21h12" /><path d="M8 3v3l4 6-4 6v3M16 3v3l-4 6 4 6v3" /></Svg>
);

const RANK_COLORS = [
  { fill: '#f2b33d', stroke: '#b77b14' },
  { fill: '#d6d3d1', stroke: '#78716c' },
  { fill: '#d08a4e', stroke: '#8a4f22' },
];

/** 순위표 1~3위 메달(금·은·동). */
export const RankMedalIcon = ({ rank, className }: IconProps & { rank: number }) => {
  const color = RANK_COLORS[rank - 1] ?? RANK_COLORS[2];
  return (
    <svg data-testid={`rank-medal-${rank}`} viewBox="0 0 24 24" className={className ?? 'h-5 w-5'} aria-hidden="true">
      <path d="M8 2h8l-2 6h-4z" fill="#b4461a" />
      <circle cx="12" cy="14" r="7" fill={color.fill} stroke={color.stroke} strokeWidth="1.5" />
      <text x="12" y="17.5" textAnchor="middle" fontSize="9" fontWeight="800" fill="#3f2a17">{rank}</text>
    </svg>
  );
};
