import type { GameType } from '../api/types';
import { GAME_ORDER, GAMES } from './registry';

export type CatalogEntry = { gameType: GameType; slug: string; tagline: string };

export const CATALOG: CatalogEntry[] = GAME_ORDER.flatMap((gameType) => {
  const game = GAMES[gameType];
  return game ? [{ gameType, slug: game.slug, tagline: game.tagline }] : [];
});

export const COMING_SOON_SLOTS = 1;

export function entryBySlug(slug: string): CatalogEntry | undefined {
  return CATALOG.find((entry) => entry.slug === slug);
}

export function lobbyPath(gameType: GameType): string {
  const entry = CATALOG.find((item) => item.gameType === gameType);
  return entry ? `/games/${entry.slug}` : '/';
}
