import { createContext, useContext, type ReactNode } from 'react';
import { zoneKey, type Zone } from './zones';

export const HiddenZonesContext = createContext<ReadonlySet<string>>(new Set());

export const LiftedZonesContext = createContext<ReadonlySet<string>>(new Set());

type Props = { zone: Zone; children: ReactNode; className?: string };

export function ZoneAnchor({ zone, children, className = '' }: Props) {
  const hidden = useContext(HiddenZonesContext);
  const lifted = useContext(LiftedZonesContext);
  const key = zoneKey(zone);
  return (
    <div data-zone={key} className={className} data-lifted={lifted.has(key) ? 'true' : undefined}
      style={{ visibility: hidden.has(key) ? 'hidden' : undefined, transform: lifted.has(key) ? 'translateY(-10px)' : undefined, transition: 'transform 150ms ease-out' }}>
      {children}
    </div>
  );
}
