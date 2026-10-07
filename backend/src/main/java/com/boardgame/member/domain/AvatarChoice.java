package com.boardgame.member.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** 회원이 고른 프로필 그림. 고르지 않았으면 비어 있고(null 컬럼), 그때는 회원 id로 기본 그림을 정한다. */
@Embeddable
public class AvatarChoice {

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "avatar", length = 20)
    private Avatar value;

    protected AvatarChoice() {
    }

    private AvatarChoice(Avatar value) {
        this.value = value;
    }

    public static AvatarChoice none() {
        return new AvatarChoice(null);
    }

    public static AvatarChoice of(Avatar avatar) {
        return new AvatarChoice(avatar);
    }

    public Avatar resolve(Long memberId) {
        if (value == null) {
            return Avatar.defaultFor(memberId);
        }
        return value;
    }
}
