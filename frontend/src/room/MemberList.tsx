import type { RoomMember } from '../api/types';
import { canForfeit, offlineSecondsNow } from '../lib/format';
import { Button } from '../components/ui';

type Props = {
  members: RoomMember[];
  meId: number;
  receivedAt: number;
  now: number;
  onForfeit: (memberId: number) => void;
};

export function MemberList({ members, meId, receivedAt, now, onForfeit }: Props) {
  return (
    <ul className="divide-y divide-stone-100">
      {members.map((member) => (
        <li key={member.id} className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${member.connected ? 'bg-safari-500' : 'bg-stone-300'}`} />
            <span className="font-medium">{member.nickname}</span>
            {member.host ? <span title="방장">👑</span> : null}
            {member.id === meId ? <span className="text-xs text-stone-400">(나)</span> : null}
            {!member.connected ? (
              <span className="text-xs text-stone-400">연결 끊김 {offlineSecondsNow(member, receivedAt, now)}초</span>
            ) : null}
          </div>
          {canForfeit(member, meId, receivedAt, now) ? (
            <Button variant="danger" className="px-3 py-1 text-xs" onClick={() => onForfeit(member.id)}>
              내보내기
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
