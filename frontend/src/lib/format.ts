import type { ResultType, RoomMember } from '../api/types';

export const FORFEIT_GRACE_SECONDS = 60;

export function percent(rate: number | null): string {
  if (rate === null) {
    return '-';
  }
  return `${(rate * 100).toFixed(1)}%`;
}

export function decimal(value: number | null): string {
  if (value === null) {
    return '-';
  }
  return value.toFixed(1);
}

/** 점수를 천 단위 쉼표와 "점"으로. 없으면 "-". */
export function points(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '-';
  }
  return `${value.toLocaleString('ko-KR')}점`;
}

/** 혼자 할 수 있는 게임(최소 인원 1명, 수박게임)인지. 혼자 한 게임은 승률 대신 최고 점수만 남는다. */
export function playsSolo(minPlayers: number | undefined): boolean {
  return minPlayers === 1;
}

/** 최근 경기 시각. 현지 시각 24시간제 `M/D HH:mm`, 읽을 수 없는 값은 빈 문자열. */
export function dateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return `${date.getMonth() + 1}/${date.getDate()} ${chatTime(iso)}`;
}

/** 채팅 말풍선 옆 시간. 현지 시각 24시간제 HH:mm, 읽을 수 없는 값은 빈 문자열. */
export function chatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const two = (value: number) => String(value).padStart(2, '0');
  return `${two(date.getHours())}:${two(date.getMinutes())}`;
}

const RESULT_LABELS: Record<ResultType, string> = { WIN: '승', DRAW: '무', LOSE: '패' };

export function resultLabel(result: ResultType | null): string {
  if (result === null) {
    return '-';
  }
  return RESULT_LABELS[result];
}

export function offlineSecondsNow(member: RoomMember, receivedAt: number, now: number): number {
  if (member.connected) {
    return 0;
  }
  return member.offlineSeconds + Math.floor((now - receivedAt) / 1000);
}

export function canForfeit(member: RoomMember, meId: number, receivedAt: number, now: number): boolean {
  return member.id !== meId && !member.connected && offlineSecondsNow(member, receivedAt, now) >= FORFEIT_GRACE_SECONDS;
}
