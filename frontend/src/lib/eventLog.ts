export type LogKind = 'draw-deck' | 'draw-discard' | 'place' | 'undo' | 'peek' | 'start' | 'result' | 'timeout' | 'leave' | 'other'
  | 'play' | 'skip' | 'reverse' | 'color' | 'challenge' | 'uno' | 'catch' | 'reshuffle' | 'pair' | 'shuffle' | 'finish' | 'thief';
export type LogDraft = { kind: LogKind; actorId?: number; text: string };
export type LogEntry = LogDraft & { id: number; at: number };

/** 게임 동안의 진행 기록을 이만큼까지 남긴다(진행 기록 창에서 스크롤로 본다). */
export const LOG_LIMIT = 200;

/** 새 기록을 앞에 붙이고 오래된 것부터 LOG_LIMIT을 넘는 만큼 버린다. */
export function prependLog(current: LogEntry[], entries: LogEntry[]): LogEntry[] {
  return [...entries, ...current].slice(0, LOG_LIMIT);
}
