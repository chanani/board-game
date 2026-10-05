package com.boardgame.room.domain;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class RoomCodeTest {

    @Test
    void 소문자로_입력해도_대문자_코드가_된다() {
        assertThat(RoomCode.parse("ab12cd")).isEqualTo(new RoomCode("AB12CD"));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"ABC", "ABCDEFG", "AB-12C"})
    void 형식이_맞지_않으면_ROOM_NOT_FOUND(String value) {
        assertError(() -> RoomCode.parse(value), ErrorCode.ROOM_NOT_FOUND);
    }

    @Test
    void 생성기는_헷갈리는_문자_없이_6자리_코드를_만든다() {
        RandomRoomCodeGenerator generator = new RandomRoomCodeGenerator();

        IntStream.range(0, 200).forEach(index -> assertThat(generator.next().value())
                .matches("^[A-Z0-9]{6}$")
                .doesNotContain("0", "O", "1", "I"));
    }
}
