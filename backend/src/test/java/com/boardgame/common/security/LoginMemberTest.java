package com.boardgame.common.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.security.Principal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

class LoginMemberTest {

    @Test
    void 이름은_회원_id_문자열이다() {
        assertThat(new LoginMember(42L, "앨리스").getName()).isEqualTo("42");
    }

    @Test
    void 인증_토큰에서_회원_id를_꺼낸다() {
        Principal principal = UsernamePasswordAuthenticationToken.authenticated(
                new LoginMember(42L, "앨리스"), null, List.of());

        assertThat(LoginMember.idOf(principal)).isEqualTo(42L);
    }
}
