package com.boardgame.member.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.Arrays;

/** 프로필 사진으로 고를 수 있는 동물 얼굴 그림 12종. 키(이름)는 프론트 그림과 1:1로 맞춘다. */
public enum Avatar {
    CAT, DOG, RABBIT, BEAR, PANDA, FOX, FROG, CHICK, PIG, KOALA, TIGER, PENGUIN;

    public static Avatar parse(String key) {
        return Arrays.stream(values())
                .filter(avatar -> avatar.name().equals(key))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_AVATAR));
    }

    /** 아직 고르지 않은 회원의 그림. 회원 id로 정해져 언제나 같다(프론트 defaultAvatar와 같은 규칙). */
    public static Avatar defaultFor(long memberId) {
        Avatar[] all = values();
        return all[(int) Math.floorMod(memberId, (long) all.length)];
    }

    public String key() {
        return name();
    }
}
