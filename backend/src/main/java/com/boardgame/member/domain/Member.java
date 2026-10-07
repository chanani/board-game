package com.boardgame.member.domain;

import com.boardgame.common.persistence.BaseTimeEntity;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "members")
public class Member extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Embedded
    private Credentials credentials;

    @Embedded
    private Nickname nickname;

    @Embedded
    private AvatarChoice avatar;

    protected Member() {
    }

    private Member(Credentials credentials, Nickname nickname) {
        this.credentials = credentials;
        this.nickname = nickname;
        this.avatar = AvatarChoice.none();
    }

    public static Member register(LoginId loginId, Nickname nickname, RawPassword password,
                                  PasswordEncryptor encryptor) {
        PasswordHash hash = encryptor.encrypt(password);
        return new Member(Credentials.of(loginId, hash), nickname);
    }

    public void authenticate(RawPassword password, PasswordEncryptor encryptor) {
        credentials.verify(password, encryptor);
    }

    public Long id() {
        return id;
    }

    public String loginIdValue() {
        return credentials.loginIdValue();
    }

    public String nicknameValue() {
        return nickname.value();
    }

    public void changeAvatar(Avatar chosen) {
        this.avatar = AvatarChoice.of(chosen);
    }

    /** 고른 그림, 고르지 않았으면 id로 정한 기본 그림. */
    public Avatar avatar() {
        if (avatar == null) {
            return Avatar.defaultFor(id);
        }
        return avatar.resolve(id);
    }
}
