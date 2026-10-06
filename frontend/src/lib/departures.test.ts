import { describe, expect, it } from 'vitest';
import type { Room, RoomMember } from '../api/types';
import { departures } from './departures';

const member = (id: number, nickname: string, connected = true): RoomMember =>
  ({ id, nickname, host: id === 1, connected, offlineSeconds: connected ? 0 : 70, ready: false });
const room = (status: Room['status'], members: RoomMember[]): Room => ({
  code: 'ABC234', name: '방', gameType: 'PAPER_SAFARI', gameTypeName: '페이퍼 사파리', status, hostId: 1, maxPlayers: 4,
  locked: false, theme: 'WOOD', spectators: [], members,
});
const texts = (prev: Room, next: Room, meId: number) => departures(prev, next, meId).map((d) => d.text);

describe('departures', () => {
  it('게임 중에 다른 참가자가 빠지면 "기권하고 나갔어요"', () => {
    const prev = room('PLAYING', [member(1, '앨리스'), member(2, '밥'), member(3, '캐롤')]);
    const next = room('PLAYING', [member(1, '앨리스'), member(3, '캐롤')]);
    expect(departures(prev, next, 1)).toEqual([{ memberId: 2, text: '밥님이 기권하고 나갔어요' }]);
  });

  it('연결이 끊겨 있던 사람이 빠지면 자동 기권 문구', () => {
    const prev = room('PLAYING', [member(1, '앨리스'), member(2, '밥', false)]);
    const next = room('WAITING', [member(1, '앨리스')]);
    expect(texts(prev, next, 1)).toEqual(['연결이 끊겨 밥님을 기권 처리했어요']);
  });

  it('내가 빠진 경우, 대기 중이던 방, 변화 없음은 알리지 않는다', () => {
    const playing = room('PLAYING', [member(1, '앨리스'), member(2, '밥')]);
    expect(texts(playing, room('WAITING', [member(2, '밥')]), 1)).toEqual([]);
    expect(texts(room('WAITING', [member(1, '앨리스'), member(2, '밥')]), room('WAITING', [member(1, '앨리스')]), 1)).toEqual([]);
    expect(texts(playing, playing, 1)).toEqual([]);
  });

  it('여러 명이 빠지면 사람마다 한 줄', () => {
    const prev = room('PLAYING', [member(1, '앨리스'), member(2, '밥'), member(3, '캐롤', false)]);
    const next = room('WAITING', [member(1, '앨리스')]);
    expect(texts(prev, next, 1)).toEqual(['밥님이 기권하고 나갔어요', '연결이 끊겨 캐롤님을 기권 처리했어요']);
  });

  it('관전자만 바뀐 경우는 알리지 않는다', () => {
    const prev = { ...room('PLAYING', [member(1, '앨리스')]), spectators: [{ id: 9, nickname: '관전' }] } as Room;
    expect(texts(prev, { ...prev, spectators: [] }, 1)).toEqual([]);
  });
});
