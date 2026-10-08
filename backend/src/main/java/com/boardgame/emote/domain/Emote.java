package com.boardgame.emote.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.Arrays;

// 대기실·게임 중에 보낼 수 있는 표정 10가지. 화면의 얼굴 그림 이름과 같아야 한다.
public enum Emote {
    SMILE,
    LAUGH,
    HEART_EYES,
    WINK,
    SURPRISED,
    SAD,
    CRY,
    ANGRY,
    SWEAT,
    THINKING;

    public static Emote from(String raw) {
        return Arrays.stream(values())
                .filter(emote -> emote.name().equals(raw))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_EMOTE));
    }
}
