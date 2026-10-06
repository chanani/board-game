package com.boardgame.room.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class RoomPasswordHashTest {

    @Test
    void 문자열로_바꿔도_해시값을_드러내지_않는다() {
        RoomPasswordHash hash = new RoomPasswordHash("$2a$10$secretsecretsecret");

        assertThat(hash.toString()).isEqualTo("RoomPasswordHash[****]").doesNotContain("secret");
        assertThat(RoomLock.locked(hash).toString()).doesNotContain("secret");
    }
}
