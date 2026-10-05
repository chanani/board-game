package com.boardgame.member.domain;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import org.junit.jupiter.api.Test;

class MemberTest {

    private final PasswordEncryptor encryptor = new FakePasswordEncryptor();

    private Member alice() {
        return Member.register(new LoginId("alice01"), new Nickname("앨리스"), RawPassword.of("password1"), encryptor);
    }

    @Test
    void 가입하면_아이디와_닉네임을_가진다() {
        Member member = alice();

        assertThat(member.loginIdValue()).isEqualTo("alice01");
        assertThat(member.nicknameValue()).isEqualTo("앨리스");
    }

    @Test
    void 맞는_비밀번호로_인증된다() {
        Member member = alice();

        member.authenticate(RawPassword.unchecked("password1"), encryptor);
    }

    @Test
    void 틀린_비밀번호는_INVALID_CREDENTIALS() {
        Member member = alice();

        assertError(() -> member.authenticate(RawPassword.unchecked("wrong-password"), encryptor),
                ErrorCode.INVALID_CREDENTIALS);
    }
}
