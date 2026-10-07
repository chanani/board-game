package com.boardgame.oldmaid;

import static com.boardgame.oldmaid.OldMaidFixtures.A;
import static com.boardgame.oldmaid.OldMaidFixtures.B;
import static com.boardgame.oldmaid.OldMaidFixtures.C;
import static com.boardgame.oldmaid.OldMaidFixtures.D;
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
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class OldMaidForfeitTest {

    private static final Instant T0 = Instant.parse("2026-10-07T00:00:00Z");

    @Test
    void R25_손패를_다음_카드_가진_사람에게_넘기고_짝을_버린다() {
        OldMaidGame game = game(A, hands(
                List.of(s(Rank.TWO), s(Rank.THREE)),
                List.of(h(Rank.FOUR), JOKER),
                List.of(c(Rank.TWO), d(Rank.NINE))));

        game.forfeit(C);

        assertThat(game.handOf(A)).containsExactly(s(Rank.THREE), d(Rank.NINE));
        assertThat(game.handOf(C)).isEmpty();
        assertThat(game.hasForfeited(C)).isTrue();
        assertThat(game.isParticipant(C)).isFalse();
        assertThat(game.holds(C)).isFalse();
        assertThat(game.latestEvents()).extracting(OldMaidEvent::type)
                .containsExactly(OldMaidEventType.FORFEIT, OldMaidEventType.PAIR);
        OldMaidEvent forfeit = game.latestEvents().get(0);
        assertThat(forfeit.actor()).isEqualTo(C);
        assertThat(forfeit.target()).isEqualTo(A);
        assertThat(forfeit.count()).isEqualTo(2);
        assertThat(forfeit.cards()).isEmpty();
        assertThat(game.latestEvents().get(1).cards()).containsExactly(s(Rank.TWO), c(Rank.TWO));
    }

    @Test
    void R27_남의_기권은_상대가_그대로면_차례_순번을_바꾸지_않고_신호만_지운다() {
        OldMaidGame game = game(A, hands(
                List.of(s(Rank.TWO)),
                List.of(h(Rank.FOUR), JOKER),
                List.of(c(Rank.FIVE)),
                List.of(d(Rank.SIX))));
        game.peek(A, Optional.of(new SlotIndex(1)), T0);

        game.forfeit(D);

        assertThat(game.drawer()).isEqualTo(A);
        assertThat(game.target()).isEqualTo(B);
        assertThat(game.turnSeq()).isEqualTo(TurnSeq.first());
        assertThat(game.handOf(A)).containsExactly(s(Rank.TWO), d(Rank.SIX));
        assertThat(game.peekSlot()).isEmpty();
    }

    @Test
    void R27_상대가_나가면_상대를_다시_정하고_마감을_새로_잰다() {
        OldMaidGame game = game(A, hands(
                List.of(s(Rank.TWO)),
                List.of(h(Rank.THREE), JOKER),
                List.of(c(Rank.FOUR)),
                List.of(d(Rank.FIVE))));

        game.forfeit(B);

        assertThat(game.handOf(C)).containsExactly(c(Rank.FOUR), h(Rank.THREE), JOKER);
        assertThat(game.drawer()).isEqualTo(A);
        assertThat(game.target()).isEqualTo(C);
        assertThat(game.turnSeq()).isEqualTo(new TurnSeq(2L));
    }

    @Test
    void R27_뽑는_사람이_나가면_그_다음_사람이_뽑는다() {
        OldMaidGame game = game(A, hands(
                List.of(s(Rank.TWO), s(Rank.THREE)),
                List.of(h(Rank.FOUR)),
                List.of(JOKER, d(Rank.FIVE))));

        game.forfeit(A);

        assertThat(game.handOf(B)).containsExactly(h(Rank.FOUR), s(Rank.TWO), s(Rank.THREE));
        assertThat(game.drawer()).isEqualTo(B);
        assertThat(game.target()).isEqualTo(C);
        assertThat(game.turnSeq()).isEqualTo(new TurnSeq(2L));
    }

    @Test
    void R26_넘겨받아_비면_그_사람이_끝내고_R29_남은_사람이_도둑으로_끝난다() {
        OldMaidGame game = game(A, hands(
                List.of(s(Rank.TWO), s(Rank.THREE)),
                List.of(h(Rank.FOUR), JOKER),
                List.of(c(Rank.TWO), d(Rank.THREE))));

        game.forfeit(C);

        assertThat(game.isFinished()).isTrue();
        OldMaidResult result = game.result().orElseThrow();
        assertThat(result.reason()).isEqualTo(OldMaidEndReason.FORFEIT);
        assertThat(result.ranking().entries()).containsExactly(
                new RankedPlayer(A, new FinishRank(1), Placement.FINISHED),
                new RankedPlayer(B, new FinishRank(2), Placement.THIEF),
                new RankedPlayer(C, new FinishRank(3), Placement.FORFEITED));
        assertThat(game.latestEvents()).extracting(OldMaidEvent::type)
                .containsExactly(OldMaidEventType.FORFEIT, OldMaidEventType.PAIR, OldMaidEventType.PAIR,
                        OldMaidEventType.FINISH, OldMaidEventType.GAME_END);
    }

    @Test
    void R29_둘이서_상대가_나가면_남은_사람이_남은_승자_1등이다() {
        OldMaidGame game = game(A, hands(List.of(s(Rank.TWO)), List.of(h(Rank.THREE), JOKER)));

        game.forfeit(B);

        OldMaidResult result = game.result().orElseThrow();
        assertThat(result.winner()).isEqualTo(A);
        assertThat(result.thief()).isEmpty();
        assertThat(result.ranking().of(A).placement()).isEqualTo(Placement.LAST_STANDING);
        assertThat(result.ranking().rankOf(B)).isEqualTo(new FinishRank(2));
        OldMaidEvent end = game.latestEvents().get(game.latestEvents().size() - 1);
        assertThat(end.actor()).isEqualTo(A);
        assertThat(end.count()).isEqualTo(1);
        assertThat(end.reason()).isEqualTo(OldMaidEndReason.FORFEIT);
    }

    @Test
    void R28_이미_끝낸_사람은_기권_대상이_아니고_기권한_사람은_다시_행동할_수_없다() {
        OldMaidGame game = game(A, hands(
                List.of(s(Rank.TWO)),
                List.of(s(Rank.ACE), h(Rank.ACE)),
                List.of(c(Rank.THREE), JOKER),
                List.of(d(Rank.FOUR))));

        assertThatThrownBy(() -> game.forfeit(B))
                .isInstanceOfSatisfying(BusinessException.class,
                        error -> assertThat(error.errorCode()).isEqualTo(ErrorCode.NOT_A_PLAYER));
        game.forfeit(D);
        assertThatThrownBy(() -> game.shuffle(D, T0))
                .isInstanceOfSatisfying(BusinessException.class,
                        error -> assertThat(error.errorCode()).isEqualTo(ErrorCode.NOT_A_PLAYER));
        assertThat(game.finishRankOf(B)).contains(new FinishRank(1));
    }
}
