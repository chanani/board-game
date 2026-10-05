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

export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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
