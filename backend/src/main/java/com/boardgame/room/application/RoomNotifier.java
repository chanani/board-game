package com.boardgame.room.application;

import com.boardgame.room.api.RoomResponse;

public interface RoomNotifier {

    void roomUpdated(RoomResponse room);

    void gameUpdated(long memberId, Object view);

    /** 한 사람에게 게임 신호(상태 변화 없음)를 보낸다. */
    void gameSignal(long memberId, Object signal);
}
