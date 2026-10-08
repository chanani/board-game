import type { BotDifficulty, RoomMember } from '../api/types';

export const BOT_DIFFICULTIES: BotDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];

export const DIFFICULTY_SHORT: Record<BotDifficulty, string> = { EASY: '하', MEDIUM: '중', HARD: '상' };

export const DIFFICULTY_BUTTON: Record<BotDifficulty, string> = { EASY: '하 · 쉬움', MEDIUM: '중 · 보통', HARD: '상 · 어려움' };

export const DIFFICULTY_NOTE: Record<BotDifficulty, string> = {
  EASY: '실수도 하고 가끔 엉뚱한 선택을 해요.',
  MEDIUM: '무난하게 두고 가끔 실수해요.',
  HARD: '상대 패와 지난 흐름을 기억해서 신중하게 둬요.',
};

export function botLabel(difficulty: BotDifficulty): string {
  return `컴퓨터 · ${DIFFICULTY_SHORT[difficulty]}`;
}

/** 컴퓨터 참가자면 난이도(없으면 중), 사람이면 undefined. */
export function botOf(member?: Pick<RoomMember, 'bot' | 'difficulty'> | null): BotDifficulty | undefined {
  if (!member?.bot) {
    return undefined;
  }
  return member.difficulty ?? 'MEDIUM';
}
