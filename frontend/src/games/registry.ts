import type { GameType } from '../api/types';
import type { GameModule } from './gameModule';
import { paperSafariModule } from './papersafari/module';
import { unoModule } from './uno/module';

// 게임 모듈과 그 하위 파일은 catalog.ts를 import하지 않는다(catalog.ts가 이 파일을 쓰므로 순환을 피한다).
export const GAME_ORDER: GameType[] = ['PAPER_SAFARI', 'UNO'];

// 모듈마다 화면 타입이 달라 any로 모은다(스펙 5.2).
export const GAMES: Partial<Record<GameType, GameModule<any>>> = {
  PAPER_SAFARI: paperSafariModule,
  UNO: unoModule,
};

export function findGame(type: string): GameModule<any> | undefined {
  return (GAMES as Record<string, GameModule<any> | undefined>)[type];
}

export function gameOf(type: GameType): GameModule<any> {
  const game = findGame(type);
  if (!game) {
    throw new Error(`등록되지 않은 게임: ${type}`);
  }
  return game;
}

/** 화면의 게임 종류 구분자. 예전 페이퍼 사파리 화면처럼 없으면 페이퍼 사파리로 본다(D3). */
export function sessionGameType(view: { gameType?: string }): string {
  return view.gameType ?? 'PAPER_SAFARI';
}
