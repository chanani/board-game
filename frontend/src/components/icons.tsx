import type { ReactNode } from 'react';

type IconProps = { className?: string };

function Svg({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
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
