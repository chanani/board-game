package com.boardgame.room.application;

import static org.mockito.Mockito.after;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.Test;

class DisconnectForfeitSchedulerTest {

    @Test
    void 앱이_뜬_직후에는_확인하지_않고_한_주기_뒤부터_확인한다() {
        RoomService roomService = mock(RoomService.class);

        DisconnectForfeitScheduler scheduler = new DisconnectForfeitScheduler(roomService);

        verify(roomService, after(500).never()).forfeitLongDisconnected();
        scheduler.stop();
    }
}
