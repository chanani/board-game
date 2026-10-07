package com.boardgame.member.application;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.member.api.ChangeAvatarRequest;
import com.boardgame.member.api.LoginRequest;
import com.boardgame.member.api.SignUpRequest;
import com.boardgame.member.domain.Avatar;
import com.boardgame.member.domain.LoginId;
import com.boardgame.member.domain.Member;
import com.boardgame.member.domain.MemberRepository;
import com.boardgame.member.domain.Nickname;
import com.boardgame.member.domain.PasswordEncryptor;
import com.boardgame.member.domain.RawPassword;
import java.util.Locale;
import java.util.Objects;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class MemberService {

    private final MemberRepository memberRepository;
    private final PasswordEncryptor passwordEncryptor;
    private final ApplicationEventPublisher eventPublisher;

    public MemberService(MemberRepository memberRepository, PasswordEncryptor passwordEncryptor,
                         ApplicationEventPublisher eventPublisher) {
        this.memberRepository = memberRepository;
        this.passwordEncryptor = passwordEncryptor;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public Member register(SignUpRequest request) {
        LoginId loginId = new LoginId(request.loginId());
        Nickname nickname = new Nickname(request.nickname());
        RawPassword password = RawPassword.of(request.password());
        validateUnique(loginId, nickname);
        return memberRepository.save(Member.register(loginId, nickname, password, passwordEncryptor));
    }

    public Member authenticate(LoginRequest request) {
        String loginId = Objects.toString(request.loginId(), "").toLowerCase(Locale.ROOT);
        Member member = memberRepository.findByCredentialsLoginIdValue(loginId)
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_CREDENTIALS));
        member.authenticate(RawPassword.unchecked(request.password()), passwordEncryptor);
        return member;
    }

    public Member find(long id) {
        return memberRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));
    }

    @Transactional
    public Member changeAvatar(long memberId, ChangeAvatarRequest request) {
        Avatar chosen = Avatar.parse(avatarKeyOf(request));
        Member member = find(memberId);
        member.changeAvatar(chosen);
        eventPublisher.publishEvent(new AvatarChangedEvent(memberId, chosen));
        return member;
    }

    private String avatarKeyOf(ChangeAvatarRequest request) {
        if (request == null) {
            return null;
        }
        return request.avatar();
    }

    private void validateUnique(LoginId loginId, Nickname nickname) {
        if (memberRepository.existsByCredentialsLoginIdValue(loginId.value())) {
            throw new BusinessException(ErrorCode.DUPLICATE_LOGIN_ID);
        }
        if (memberRepository.existsByNicknameValue(nickname.value())) {
            throw new BusinessException(ErrorCode.DUPLICATE_NICKNAME);
        }
    }
}
