package com.boardgame.room.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;

public record RoomLock(RoomPasswordHash hash) {

    public static RoomLock open() {
        return new RoomLock(null);
    }

    public static RoomLock locked(RoomPasswordHash hash) {
        return new RoomLock(hash);
    }

    public boolean isLocked() {
        return hash != null;
    }

    public void require(String rawOrNull, RoomPasswordHasher hasher) {
        if (!isLocked()) {
            return;
        }
        if (!accepts(rawOrNull, hasher)) {
            throw new BusinessException(ErrorCode.ROOM_PASSWORD_MISMATCH);
        }
    }

    private boolean accepts(String rawOrNull, RoomPasswordHasher hasher) {
        if (rawOrNull == null) {
            return false;
        }
        String stripped = rawOrNull.strip();
        if (stripped.length() < 4 || stripped.length() > 20) {
            return false;
        }
        return hasher.matches(new RawRoomPassword(stripped), hash);
    }
}
