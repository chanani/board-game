import type { ReactNode } from 'react';

export function WoodRail({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`wood-rail rounded-xl ${className}`}>{children}</div>;
}
