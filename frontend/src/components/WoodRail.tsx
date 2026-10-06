import type { ReactNode } from 'react';

export function WoodRail({ children, className = '', testId }: { children?: ReactNode; className?: string; testId?: string }) {
  return <div data-testid={testId} className={`wood-rail rounded-xl ${className}`}>{children}</div>;
}
