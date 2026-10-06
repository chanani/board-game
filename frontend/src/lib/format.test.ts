import { describe, expect, it } from 'vitest';
import { canForfeit, chatTime, dateTime, decimal, offlineSecondsNow, percent, resultLabel } from './format';
import type { RoomMember } from '../api/types';

const offline = (seconds: number): RoomMember => ({ id: 2, nickname: '밥', host: false, connected: false, offlineSeconds: seconds, ready: false });

describe('format', () => {
  it('승률은 퍼센트로, null은 - 로 보여준다', () => {
    expect(percent(0.6667)).toBe('66.7%');
    expect(percent(null)).toBe('-');
    expect(decimal(14)).toBe('14.0');
    expect(decimal(null)).toBe('-');
  });

  it('최근 경기 시각은 24시간제 M/D HH:mm 이다', () => {
    expect(dateTime(new Date(2026, 9, 6, 13, 5).toISOString())).toBe('10/6 13:05');
    expect(dateTime(new Date(2026, 0, 12, 0, 7).toISOString())).toBe('1/12 00:07');
    expect(dateTime('nope')).toBe('');
  });

  it('결과를 한 글자로 보여준다', () => {
    expect(resultLabel('WIN')).toBe('승');
    expect(resultLabel('DRAW')).toBe('무');
    expect(resultLabel('LOSE')).toBe('패');
    expect(resultLabel(null)).toBe('-');
  });

  it('받은 뒤 지난 시간을 더해 끊긴 시간을 계산한다', () => {
    expect(offlineSecondsNow(offline(30), 1_000, 11_000)).toBe(40);
    expect(offlineSecondsNow({ ...offline(30), connected: true }, 1_000, 11_000)).toBe(0);
  });

  it('60초 이상 끊긴 다른 사람만 내보낼 수 있다', () => {
    expect(canForfeit(offline(59), 1, 0, 0)).toBe(false);
    expect(canForfeit(offline(60), 1, 0, 0)).toBe(true);
    expect(canForfeit(offline(90), 2, 0, 0)).toBe(false);
  });

  it('채팅 시간은 현지 시각 24시간제 HH:mm으로, 잘못된 값은 빈 문자열로 보여준다', () => {
    expect(chatTime(new Date(2026, 9, 6, 9, 5).toISOString())).toBe('09:05');
    expect(chatTime(new Date(2026, 9, 6, 0, 0).toISOString())).toBe('00:00');
    expect(chatTime(new Date(2026, 9, 6, 23, 59).toISOString())).toBe('23:59');
    expect(chatTime('nope')).toBe('');
  });
});
