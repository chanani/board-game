package com.boardgame.member.domain;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import java.util.List;
import org.junit.jupiter.api.Test;

class AvatarTest {

    @Test
    void 동물_얼굴_12종이_정해진_순서로_있다() {
        assertThat(List.of(Avatar.values())).extracting(Avatar::key).containsExactly(
                "CAT", "DOG", "RABBIT", "BEAR", "PANDA", "FOX", "FROG", "CHICK", "PIG", "KOALA", "TIGER", "PENGUIN");
    }

    @Test
    void 키로_고르고_없는_키나_빈_값은_INVALID_AVATAR() {
        assertThat(Avatar.parse("PANDA")).isEqualTo(Avatar.PANDA);
        assertError(() -> Avatar.parse("DRAGON"), ErrorCode.INVALID_AVATAR);
        assertError(() -> Avatar.parse("panda"), ErrorCode.INVALID_AVATAR);
        assertError(() -> Avatar.parse(null), ErrorCode.INVALID_AVATAR);
    }

    @Test
    void 기본_그림은_회원_id를_12로_나눈_나머지로_정한다() {
        assertThat(Avatar.defaultFor(1)).isEqualTo(Avatar.DOG);
        assertThat(Avatar.defaultFor(12)).isEqualTo(Avatar.CAT);
        assertThat(Avatar.defaultFor(23)).isEqualTo(Avatar.PENGUIN);
    }

    @Test
    void 그림책은_없는_회원에게_기본_그림을_준다() {
        assertThat(AvatarBook.empty().keyOf(5)).isEqualTo("FOX");
    }
}
