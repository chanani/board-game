package com.boardgame.papersafari;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import java.util.List;
import java.util.stream.LongStream;
import org.junit.jupiter.api.Test;

class SeatsTest {

    private final PlayerId a = new PlayerId(1L);
    private final PlayerId b = new PlayerId(2L);
    private final PlayerId c = new PlayerId(3L);

    @Test
    void 인원은_2명부터_5명까지다() {
        assertError(() -> Seats.of(List.of(a)), ErrorCode.INVALID_PLAYER_COUNT);
        assertError(() -> Seats.of(players(6)), ErrorCode.INVALID_PLAYER_COUNT);
        assertThat(Seats.of(players(5)).asList()).hasSize(5);
    }

    @Test
    void 다음_사람과_왼쪽_사람은_좌석_순서의_다음이고_끝에서_처음으로_돈다() {
        Seats seats = Seats.of(List.of(a, b, c));

        assertThat(seats.next(a)).isEqualTo(b);
        assertThat(seats.leftOf(b)).isEqualTo(c);
        assertThat(seats.next(c)).isEqualTo(a);
        assertThat(seats.at(4)).isEqualTo(b);
    }

    @Test
    void 빠진_사람은_순서에서_제외된다() {
        Seats seats = Seats.of(List.of(a, b, c));

        seats.remove(b);

        assertThat(seats.next(a)).isEqualTo(c);
        assertThat(seats.soleSurvivor()).isEmpty();
    }

    @Test
    void 한_명만_남으면_그_사람이_유일한_생존자다() {
        Seats seats = Seats.of(List.of(a, b));

        seats.remove(a);

        assertThat(seats.soleSurvivor()).contains(b);
    }

    @Test
    void 좌석에_없는_사람은_NOT_A_PLAYER() {
        Seats seats = Seats.of(List.of(a, b));

        assertError(() -> seats.requireSeated(c), ErrorCode.NOT_A_PLAYER);
        assertError(() -> seats.remove(c), ErrorCode.NOT_A_PLAYER);
    }

    @Test
    void 떠난_사람의_다음은_원래_순서상_다음_남은_사람이다() {
        Seats seats = Seats.of(List.of(a, b, c));

        seats.remove(b);
        assertThat(seats.next(b)).isEqualTo(c);

        seats.remove(c);
        assertThat(seats.next(b)).isEqualTo(a);
    }

    @Test
    void 중복된_플레이어로는_좌석을_만들_수_없다() {
        assertError(() -> Seats.of(List.of(a, a)), ErrorCode.INVALID_INPUT);
    }

    private List<PlayerId> players(int count) {
        return LongStream.rangeClosed(1, count).mapToObj(PlayerId::new).toList();
    }
}
