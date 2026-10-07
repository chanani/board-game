package com.boardgame.member.application;

import com.boardgame.member.domain.Avatar;
import com.boardgame.member.domain.Member;
import com.boardgame.member.domain.MemberRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class MemberAvatarLookup implements AvatarLookup {

    private final MemberRepository memberRepository;

    public MemberAvatarLookup(MemberRepository memberRepository) {
        this.memberRepository = memberRepository;
    }

    /** 없는 회원(탈퇴 등)은 id로 정한 기본 그림. */
    @Override
    @Transactional(readOnly = true)
    public Avatar avatarOf(long memberId) {
        return memberRepository.findById(memberId)
                .map(Member::avatar)
                .orElseGet(() -> Avatar.defaultFor(memberId));
    }
}
