package com.boardgame.member.domain;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberRepository extends JpaRepository<Member, Long> {

    Optional<Member> findByCredentialsLoginIdValue(String loginId);

    boolean existsByCredentialsLoginIdValue(String loginId);

    boolean existsByNicknameValue(String nickname);
}
