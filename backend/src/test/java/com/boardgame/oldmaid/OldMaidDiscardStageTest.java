package com.boardgame.oldmaid;

import static com.boardgame.oldmaid.OldMaidFixtures.A;
import static com.boardgame.oldmaid.OldMaidFixtures.B;
import static com.boardgame.oldmaid.OldMaidFixtures.C;
import static com.boardgame.oldmaid.OldMaidFixtures.D;
import static com.boardgame.oldmaid.OldMaidFixtures.JOKER;
import static com.boardgame.oldmaid.OldMaidFixtures.c;
import static com.boardgame.oldmaid.OldMaidFixtures.choice;
import static com.boardgame.oldmaid.OldMaidFixtures.d;
import static com.boardgame.oldmaid.OldMaidFixtures.game;
import static com.boardgame.oldmaid.OldMaidFixtures.h;
import static com.boardgame.oldmaid.OldMaidFixtures.hands;
import static com.boardgame.oldmaid.OldMaidFixtures.s;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

// R37: 게임 중 뽑은 카드로 짝이 되면 뽑은 사람이 그 짝을 직접 버려야 차례가 넘어간다.
class OldMaidDiscardStageTest {

    private static final Instant T0 = Instant.parse("2026-10-07T00:00:00Z");

    private static void assertError(Runnable action, ErrorCode code) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(BusinessException.class, error -> assertThat(error.errorCode()).isEqualTo(code));
    }

    // A: 3·4, B: 3·조커, C: 9·10, D: 4. A가 B의 0번(하트 3)을 뽑으면 짝 버리기 단계.
    private OldMaidGame drawnPair() {
        OldMaidGame game = game(A, hands(
                List.of(s(Rank.THREE), s(Rank.FOUR)),
                List.of(h(Rank.THREE), JOKER),
                List.of(c(Rank.NINE), d(Rank.TEN)),
                List.of(c(Rank.FOUR))));
        game.draw(A, new SlotIndex(0));
        return game;
    }

    @Test
    void R37_짝_버리기_단계에는_다시_뽑을_수_없고_남은_버릴_수_없고_신호도_없다() {
        OldMaidGame game = drawnPair();

        assertError(() -> game.draw(A, new SlotIndex(0)), ErrorCode.INVALID_PHASE);
        assertError(() -> game.discard(B, choice(JOKER, h(Rank.THREE))), ErrorCode.NOT_YOUR_TURN);
        assertThat(game.peek(A, Optional.of(new SlotIndex(0)), T0)).isFalse();
        assertThat(game.canShuffle(A)).isFalse();
        assertThat(game.canShuffle(B)).isTrue();
        assertThat(game.peekSlot()).isEmpty();
    }

    @Test
    void R37_뽑은_카드와_상관없는_두_장이나_짝이_아닌_두_장은_버릴_수_없다() {
        OldMaidGame game = drawnPair();

        assertError(() -> game.discard(A, choice(s(Rank.FOUR), h(Rank.THREE))), ErrorCode.OLD_MAID_NOT_A_PAIR);
        assertError(() -> game.discard(A, choice(s(Rank.FOUR), c(Rank.FOUR))), ErrorCode.OLD_MAID_CARD_NOT_IN_HAND);
        assertThat(game.stage()).isEqualTo(OldMaidStage.DISCARD);
        assertThat(game.cardCount(A)).isEqualTo(3);
    }

    @Test
    void R37_뽑기_단계에서는_뽑는_사람도_DISCARD를_할_수_없다() {
        OldMaidGame game = game(A, hands(
                List.of(s(Rank.THREE), s(Rank.FOUR)),
                List.of(h(Rank.NINE), JOKER),
                List.of(c(Rank.SEVEN))));

        assertError(() -> game.discard(A, choice(s(Rank.THREE), s(Rank.FOUR))), ErrorCode.INVALID_PHASE);
        assertError(() -> game.discard(B, choice(h(Rank.NINE), JOKER)), ErrorCode.NOT_YOUR_TURN);
    }

    @Test
    void R27_R37_짝_버리기_단계에_상대가_나가면_상대만_바뀌고_단계와_마감_순번은_그대로다() {
        OldMaidGame game = drawnPair();
        TurnStep before = game.step();

        game.forfeit(B);

        assertThat(game.stage()).isEqualTo(OldMaidStage.DISCARD);
        assertThat(game.step()).isEqualTo(before);
        assertThat(game.drawer()).isEqualTo(A);
        assertThat(game.target()).isEqualTo(C);
        game.discard(A, choice(h(Rank.THREE), s(Rank.THREE)));
        assertThat(game.drawer()).isEqualTo(C);
    }

    @Test
    void R25_R37_짝_버리기_단계의_뽑은_사람이_기권한_손패를_받으며_그_짝이_버려지면_차례가_넘어간다() {
        OldMaidGame game = drawnPair();

        game.forfeit(D);

        // D의 클로버 4는 A가 받는다(D 다음 카드 가진 사람). 3 짝과 4 짝이 받으며 모두 버려져 A는 빈손으로 끝난다.
        assertThat(game.handOf(A)).isEmpty();
        assertThat(game.finishRankOf(A)).contains(new FinishRank(1));
        assertThat(game.stage()).isEqualTo(OldMaidStage.DRAW);
        assertThat(game.drawer()).isEqualTo(B);
        assertThat(game.target()).isEqualTo(C);
    }

    @Test
    void R27_R37_짝_버리기_단계의_뽑은_사람이_기권하면_다음_사람이_뽑는다() {
        OldMaidGame game = drawnPair();

        game.forfeit(A);

        assertThat(game.stage()).isEqualTo(OldMaidStage.DRAW);
        assertThat(game.drawer()).isEqualTo(B);
        assertThat(game.target()).isEqualTo(C);
        assertThat(game.turnSeq()).isEqualTo(new TurnSeq(2L));
    }
}
