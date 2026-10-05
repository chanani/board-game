import type { ReactNode } from 'react';

type Props = { children: ReactNode; className?: string; shape?: 'oval' | 'rect' };

export function Felt({ children, className = '', shape = 'rect' }: Props) {
  const radius = shape === 'oval' ? 'rounded-[48%/40%]' : 'rounded-[28px]';
  return <div className={`felt relative ${radius} ${className}`}>{children}</div>;
}
