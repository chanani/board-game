package com.boardgame.member.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

@DataJpaTest
class MemberRepositoryTest {

    @Autowired
    private MemberRepository memberRepository;

    private final PasswordEncryptor encryptor = new FakePasswordEncryptor();

    private Member member(String loginId, String nickname) {
        return Member.register(new LoginId(loginId), new Nickname(nickname), RawPassword.of("password1"), encryptor);
    }

    @Test
    void 아이디로_회원을_찾고_가입_시각이_기록된다() {
        memberRepository.saveAndFlush(member("alice01", "앨리스"));

        assertThat(memberRepository.findByCredentialsLoginIdValue("alice01")).hasValueSatisfying(found -> {
            assertThat(found.id()).isNotNull();
            assertThat(found.nicknameValue()).isEqualTo("앨리스");
            assertThat(found.createdAt()).isNotNull();
        });
        assertThat(memberRepository.findByCredentialsLoginIdValue("nobody")).isEmpty();
    }

    @Test
    void 아이디와_닉네임_사용_여부를_확인한다() {
        memberRepository.saveAndFlush(member("alice01", "앨리스"));

        assertThat(memberRepository.existsByCredentialsLoginIdValue("alice01")).isTrue();
        assertThat(memberRepository.existsByCredentialsLoginIdValue("bob01")).isFalse();
        assertThat(memberRepository.existsByNicknameValue("앨리스")).isTrue();
        assertThat(memberRepository.existsByNicknameValue("밥")).isFalse();
    }
}
