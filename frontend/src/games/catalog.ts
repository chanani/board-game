import type { GameType } from '../api/types';

export type CatalogEntry = { gameType: GameType; slug: string; tagline: string };

export const CATALOG: CatalogEntry[] = [
  { gameType: 'PAPER_SAFARI', slug: 'paper-safari', tagline: '2~5인 · 낮은 점수를 노려라!' },
];

export const COMING_SOON_SLOTS = 1;

export function entryBySlug(slug: string): CatalogEntry | undefined {
  return CATALOG.find((entry) => entry.slug === slug);
}

export function lobbyPath(gameType: GameType): string {
  const entry = CATALOG.find((item) => item.gameType === gameType);
  return entry ? `/games/${entry.slug}` : '/';
}
