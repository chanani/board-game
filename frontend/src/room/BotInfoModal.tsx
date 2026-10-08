import type { RoomMember } from '../api/types';
import { BotChip } from '../components/BotChip';
import { MemberAvatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import { botOf, DIFFICULTY_NOTE } from '../lib/bots';

/** 컴퓨터 자리를 누르면 뜨는 정보 창. 컴퓨터는 전적이 없어 전적 API를 부르지 않는다. */
export function BotInfoModal({ target, onClose }: { target: RoomMember | null; onClose: () => void }) {
  const difficulty = botOf(target);
  return (
    <Modal open={target !== null} title={target ? `${target.nickname} 정보` : '컴퓨터 정보'} onClose={onClose}>
      {target && difficulty ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 pr-8">
            <MemberAvatar memberId={target.id} avatar={target.avatar} size={56} />
            <div className="min-w-0">
              <h2 className="truncate text-lg font-black text-wood-800">{target.nickname}</h2>
              <BotChip difficulty={difficulty} />
            </div>
          </div>
          <p className="text-sm text-stone-600">{DIFFICULTY_NOTE[difficulty]}</p>
          <p className="text-xs text-stone-500">컴퓨터와 한 경기는 전적에 넣지 않아요.</p>
        </div>
      ) : null}
    </Modal>
  );
}
