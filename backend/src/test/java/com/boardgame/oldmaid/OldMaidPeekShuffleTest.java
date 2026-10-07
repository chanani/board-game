package com.boardgame.oldmaid;

import static com.boardgame.oldmaid.OldMaidFixtures.A;
import static com.boardgame.oldmaid.OldMaidFixtures.B;
import static com.boardgame.oldmaid.OldMaidFixtures.C;
import static com.boardgame.oldmaid.OldMaidFixtures.JOKER;
import static com.boardgame.oldmaid.OldMaidFixtures.c;
import static com.boardgame.oldmaid.OldMaidFixtures.d;
import static com.boardgame.oldmaid.OldMaidFixtures.game;
import static com.boardgame.oldmaid.OldMaidFixtures.h;
import static com.boardgame.oldmaid.OldMaidFixtures.hands;
import static com.boardgame.oldmaid.OldMaidFixtures.s;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class OldMaidPeekShuffleTest {

    private static final Instant T0 = Instant.parse("2026-10-07T00:00:00Z");

    private static Instant at(long millis) {
        return T0.plus(Duration.ofMillis(millis));
    }

    private static Optional<SlotIndex> slot(int index) {
        return Optional.of(new SlotIndex(index));
    }

    private static void assertError(Runnable action, ErrorCode code) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(BusinessException.class, error -> assertThat(error.errorCode()).isEqualTo(code));
    }

    private static final OldMaidShuffler REVERSE = cards -> {
        List<PlayingCard> copy = new ArrayList<>(cards);
        Collections.reverse(copy);
        return copy;
    };

    private OldMaidGame threePlayers() {
        return game(A, hands(
                List.of(s(Rank.THREE), s(Rank.FOUR)),
                List.of(h(Rank.NINE), JOKER, d(Rank.KING)),
                List.of(c(Rank.SEVEN), d(Rank.TEN))), new OldMaidDice(REVERSE, bound -> 0));
    }

    @Test
    void R17_뽑는_사람의_신호를_받아_자리와_순번을_바꾼다() {
        OldMaidGame game = threePlayers();

        assertThat(game.peek(A, slot(1), T0)).isTrue();

        assertThat(game.peekSlot()).contains(new SlotIndex(1));
        assertThat(game.peekSeq()).isEqualTo(1L);
        assertThat(game.peek(A, Optional.empty(), at(100))).isTrue();
        assertThat(game.peekSlot()).isEmpty();
        assertThat(game.peekSeq()).isEqualTo(2L);
    }

    @Test
    void R18_남의_차례와_범위_밖_신호는_조용히_버린다() {
        OldMaidGame game = threePlayers();

        assertThat(game.peek(B, slot(0), T0)).isFalse();
        assertThat(game.peek(new PlayerId(99L), slot(0), T0)).isFalse();
        assertThat(game.peek(A, slot(3), T0)).isFalse();
        assertThat(game.peek(A, Optional.empty(), T0)).isFalse();
        assertThat(game.peekSeq()).isZero();
    }

    @Test
    void R19_같은_자리와_50ms_안의_신호는_버린다() {
        OldMaidGame game = threePlayers();

        assertThat(game.peek(A, slot(0), T0)).isTrue();
        assertThat(game.peek(A, slot(0), at(200))).isFalse();
        assertThat(game.peek(A, slot(1), at(30))).isFalse();
        assertThat(game.peek(A, slot(1), at(60))).isTrue();

        assertThat(game.peekSlot()).contains(new SlotIndex(1));
        assertThat(game.peekSeq()).isEqualTo(2L);
    }

    @Test
    void R21_차례가_바뀌면_신호를_지우고_섞기는_지우지_않는다() {
        OldMaidGame game = threePlayers();
        game.peek(A, slot(2), T0);

        game.shuffle(B, T0);
        assertThat(game.peekSlot()).contains(new SlotIndex(2));
        assertThat(game.peekSeq()).isEqualTo(1L);

        game.draw(A, new SlotIndex(0));
        assertThat(game.peekSlot()).isEmpty();
        assertThat(game.peekSeq()).isEqualTo(2L);
    }

    @Test
    void R21_차례가_바뀌면_새로_뽑는_사람의_첫_신호는_50ms_안이어도_받는다() {
        OldMaidGame game = threePlayers();
        game.peek(A, slot(2), T0);
        game.draw(A, new SlotIndex(0));

        assertThat(game.peek(B, slot(0), at(10))).isTrue();
        assertThat(game.peekSlot()).contains(new SlotIndex(0));
    }

    @Test
    void 끝난_게임의_신호는_버린다() {
        OldMaidGame game = game(A, hands(List.of(s(Rank.FIVE)), List.of(h(Rank.FIVE), JOKER)));
        game.draw(A, new SlotIndex(0));

        assertThat(game.peek(B, slot(0), T0)).isFalse();
    }

    @Test
    void R24_섞으면_그_사람_손패_순서만_바뀌고_차례와_마감_순번은_그대로다() {
        OldMaidGame game = threePlayers();

        game.shuffle(B, T0);

        assertThat(game.handOf(B)).containsExactly(d(Rank.KING), JOKER, h(Rank.NINE));
        assertThat(game.latestEvents()).extracting(OldMaidEvent::type).containsExactly(OldMaidEventType.SHUFFLE);
        assertThat(game.latestEvents().get(0).actor()).isEqualTo(B);
        assertThat(game.latestEvents().get(0).cards()).isEmpty();
        assertThat(game.turnSeq()).isEqualTo(TurnSeq.first());
        assertThat(game.drawer()).isEqualTo(A);
    }

    @Test
    void R22_내가_뽑을_차례이거나_이미_끝냈으면_섞을_수_없다() {
        OldMaidGame game = game(A, hands(
                List.of(s(Rank.THREE), JOKER),
                List.of(s(Rank.ACE), h(Rank.ACE)),
                List.of(c(Rank.SEVEN))));

        assertThat(game.canShuffle(A)).isFalse();
        assertThat(game.canShuffle(B)).isFalse();
        assertThat(game.canShuffle(C)).isTrue();
        assertError(() -> game.shuffle(A, T0), ErrorCode.OLD_MAID_SHUFFLE_NOT_ALLOWED);
        assertError(() -> game.shuffle(B, T0), ErrorCode.OLD_MAID_SHUFFLE_NOT_ALLOWED);
        assertError(() -> game.shuffle(new PlayerId(99L), T0), ErrorCode.NOT_A_PLAYER);
    }

    @Test
    void R23_같은_사람은_1초가_지나야_다시_섞는다() {
        OldMaidGame game = threePlayers();
        game.shuffle(B, T0);

        assertError(() -> game.shuffle(B, at(999)), ErrorCode.OLD_MAID_SHUFFLE_TOO_FAST);
        game.shuffle(C, at(10));
        game.shuffle(B, at(1000));

        assertThat(game.handOf(B)).containsExactly(h(Rank.NINE), JOKER, d(Rank.KING));
    }
}
