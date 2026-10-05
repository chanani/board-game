package com.boardgame.room.application;

import com.boardgame.room.api.RoomResponse;

public interface RoomNotifier {

    void roomUpdated(RoomResponse room);

    void gameUpdated(long memberId, Object view);
}
