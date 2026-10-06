import { roomsApi } from '../api/rooms';

/** 로그인 직후에만, 들어가 있던 방이 있으면 그 방으로 보낸다. 확인이 실패하면 목록으로 간다. */
export async function pathAfterLogin(): Promise<string> {
  try {
    const room = await roomsApi.mine();
    return room ? `/rooms/${room.code}` : '/';
  } catch {
    return '/';
  }
}
