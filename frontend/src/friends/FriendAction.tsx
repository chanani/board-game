import { useState } from 'react';
import { messageOf } from '../api/http';
import { UserPlusIcon } from '../components/icons';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui';
import { sentMessage } from './FriendSearchCard';
import { relationOf, useFriends, type FriendsState } from './FriendsContext';

type Target = { id: number; nickname: string };

/**
 * 전적 창 아래의 친구 버튼. 남이면 "친구 추가", 내가 요청해 두었으면 "요청 보냄", 친구면 "친구 삭제".
 * 나 자신이거나 친구 기능을 쓸 수 없는 곳에서는 아무것도 그리지 않는다(컴퓨터는 전적 창이 뜨지 않는다).
 */
export function FriendAction({ target, onAskRemove }: { target: Target; onAskRemove: () => void }) {
  const friends = useFriends();
  if (!friends || relationOf(friends, target.id) === 'me') {
    return null;
  }
  return (
    <div data-testid="friend-action" className="border-t border-wood-700/15 pt-4">
      <RelationButton friends={friends} target={target} onAskRemove={onAskRemove} />
    </div>
  );
}

function RelationButton({ friends, target, onAskRemove }: { friends: FriendsState; target: Target; onAskRemove: () => void }) {
  const toast = useToast();
  const [sending, setSending] = useState(false);
  const relation = relationOf(friends, target.id);

  const add = async () => {
    setSending(true);
    try {
      toast.show(sentMessage(await friends.requestById(target.id)), 'info');
    } catch (error) {
      toast.show(messageOf(error));
    } finally {
      setSending(false);
    }
  };

  if (relation === 'friend') {
    return <Button variant="danger" className="w-full" onClick={onAskRemove}>친구 삭제</Button>;
  }
  if (relation === 'outgoing') {
    return <Button variant="muted" className="w-full" disabled>요청 보냄</Button>;
  }
  return (
    <Button variant="secondary" className="flex w-full items-center justify-center gap-1.5" disabled={sending} onClick={() => void add()}>
      <UserPlusIcon />{relation === 'incoming' ? '친구 요청 수락' : '친구 추가'}
    </Button>
  );
}

type ConfirmProps = { target: Target | null; onCancel: () => void; onRemoved: () => void };

/** 친구 삭제 전에 한 번 더 묻는다. target이 없으면 닫혀 있다. */
export function FriendRemoveConfirmModal({ target, onCancel, onRemoved }: ConfirmProps) {
  const friends = useFriends();
  return friends ? <RemoveConfirm friends={friends} target={target} onCancel={onCancel} onRemoved={onRemoved} /> : null;
}

function RemoveConfirm({ friends, target, onCancel, onRemoved }: ConfirmProps & { friends: FriendsState }) {
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const question = `${target?.nickname ?? ''}님을 친구에서 삭제할까요?`;

  const confirm = async () => {
    if (!target) {
      return;
    }
    setPending(true);
    try {
      await friends.remove(target.id);
      toast.show(`${target.nickname}님을 친구에서 삭제했어요.`, 'info');
      onRemoved();
    } catch (error) {
      toast.show(messageOf(error));
      onCancel();
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal open={target !== null} title={question} onClose={onCancel}>
      <div className="flex flex-col items-center gap-4 text-center">
        <h2 className="text-lg font-bold text-wood-800">{question}</h2>
        <p className="text-sm text-stone-600">정말 삭제하시겠어요? <b className="text-red-700">서로의 친구 목록에서 사라져요.</b></p>
        <div className="flex w-full gap-3">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>취소</Button>
          <Button variant="danger" className="flex-1" disabled={pending} onClick={() => void confirm()}>삭제</Button>
        </div>
      </div>
    </Modal>
  );
}
