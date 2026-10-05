import { createContext, useContext, type ReactNode } from 'react';
import { zoneKey, type Zone } from './zones';

export const HiddenZonesContext = createContext<ReadonlySet<string>>(new Set());

type Props = { zone: Zone; children: ReactNode; className?: string };

export function ZoneAnchor({ zone, children, className = '' }: Props) {
  const hidden = useContext(HiddenZonesContext);
  const key = zoneKey(zone);
  return (
    <div data-zone={key} className={className} style={{ visibility: hidden.has(key) ? 'hidden' : undefined }}>
      {children}
    </div>
  );
}
