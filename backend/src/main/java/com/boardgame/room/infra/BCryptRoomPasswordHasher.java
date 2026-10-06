package com.boardgame.room.infra;

import com.boardgame.room.domain.RawRoomPassword;
import com.boardgame.room.domain.RoomPasswordHash;
import com.boardgame.room.domain.RoomPasswordHasher;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class BCryptRoomPasswordHasher implements RoomPasswordHasher {

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    @Override
    public RoomPasswordHash hash(RawRoomPassword raw) {
        return new RoomPasswordHash(encoder.encode(raw.value()));
    }

    @Override
    public boolean matches(RawRoomPassword raw, RoomPasswordHash hash) {
        return encoder.matches(raw.value(), hash.value());
    }
}
