package com.boardgame.room.domain;

import static com.boardgame.common.error.ErrorAssertions.assertError;

import com.boardgame.common.error.ErrorCode;
import org.junit.jupiter.api.Test;

class RoomLockTest {

    private final RoomPasswordHasher hasher = new FakeRoomPasswordHasher();

    @Test
    void 공개방은_비밀번호_없이_통과한다() {
        RoomLock.open().require(null, hasher);
    }

    @Test
    void 잠긴_방은_맞는_비밀번호만_통과한다() {
        RoomLock lock = RoomLock.locked(hasher.hash(new RawRoomPassword("1234")));
        lock.require("1234", hasher);
        assertError(() -> lock.require("9999", hasher), ErrorCode.ROOM_PASSWORD_MISMATCH);
        assertError(() -> lock.require(null, hasher), ErrorCode.ROOM_PASSWORD_MISMATCH);
        assertError(() -> lock.require("  ", hasher), ErrorCode.ROOM_PASSWORD_MISMATCH);
        assertError(() -> lock.require("12", hasher), ErrorCode.ROOM_PASSWORD_MISMATCH);
    }
}
