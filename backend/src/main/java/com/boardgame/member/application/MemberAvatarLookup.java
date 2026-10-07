package com.boardgame.member.application;

import com.boardgame.member.domain.AvatarBook;
import com.boardgame.member.domain.MemberRepository;
import java.util.Collection;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class MemberAvatarLookup implements AvatarLookup {

    private final MemberRepository memberRepository;

    public MemberAvatarLookup(MemberRepository memberRepository) {
        this.memberRepository = memberRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public AvatarBook avatarsOf(Collection<Long> memberIds) {
        if (memberIds.isEmpty()) {
            return AvatarBook.empty();
        }
        return AvatarBook.of(memberRepository.findAllById(memberIds));
    }
}
