package com.boardgame.common.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class LoginMemberTest {

    @Test
    void 이름은_회원_id_문자열이다() {
        assertThat(new LoginMember(42L, "앨리스").getName()).isEqualTo("42");
    }
}
