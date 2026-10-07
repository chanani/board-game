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
import com.boardgame.support.FixedRandom;
import java.util.List;
import org.junit.jupiter.api.Test;

class OldMaidAutoActTest {

    private OldMaidGame threePlayers() {
        return game(A, hands(
                List.of(s(Rank.TWO), s(Rank.THREE)),
                List.of(h(Rank.FOUR), JOKER, d(Rank.TWO)),
                List.of(c(Rank.NINE))));
    }

    @Test
    void R35_시간이_지나면_무작위_자리_1장을_대신_뽑고_자동으로_표시한다() {
        OldMaidGame game = threePlayers();

        List<PlayerId> actors = game.autoAct(new FixedRandom(1));

        assertThat(actors).containsExactly(A);
        assertThat(game.handOf(A)).containsExactly(JOKER, s(Rank.TWO), s(Rank.THREE));
        assertThat(game.latestEvents()).extracting(OldMaidEvent::type).containsExactly(OldMaidEventType.DRAW);
        assertThat(game.latestEvents()).allMatch(OldMaidEvent::auto);
        assertThat(game.drawer()).isEqualTo(B);
    }

    @Test
    void R35_D20_자동으로_뽑은_카드가_짝이면_짝_버리기_단계를_기다리지_않고_그_짝도_버리고_넘긴다() {
        OldMaidGame game = threePlayers();

        game.autoAct(new FixedRandom(5));

        assertThat(game.handOf(A)).containsExactly(s(Rank.THREE));
        assertThat(game.latestEvents()).extracting(OldMaidEvent::type)
                .containsExactly(OldMaidEventType.DRAW, OldMaidEventType.PAIR);
        assertThat(game.latestEvents()).allMatch(OldMaidEvent::auto);
        assertThat(game.stage()).isEqualTo(OldMaidStage.DRAW);
        assertThat(game.drawer()).isEqualTo(B);
    }

    @Test
    void R38_짝_버리기_단계에서_시간이_지나면_뽑은_사람의_짝을_대신_버리고_넘긴다() {
        OldMaidGame game = threePlayers();
        game.draw(A, new SlotIndex(2));

        List<PlayerId> actors = game.autoAct(new FixedRandom(0));

        assertThat(actors).containsExactly(A);
        assertThat(game.handOf(A)).containsExactly(s(Rank.THREE));
        assertThat(game.discards()).containsExactly(new DiscardedPair(A, new CardPair(d(Rank.TWO), s(Rank.TWO))));
        assertThat(game.latestEvents()).extracting(OldMaidEvent::type).containsExactly(OldMaidEventType.PAIR);
        assertThat(game.latestEvents()).allMatch(OldMaidEvent::auto);
        assertThat(game.drawer()).isEqualTo(B);
        assertThat(game.target()).isEqualTo(C);
    }

    @Test
    void 끝난_게임은_자동_행동을_하지_않는다() {
        OldMaidGame game = game(A, hands(List.of(s(Rank.FIVE)), List.of(h(Rank.FIVE), JOKER)));
        game.draw(A, new SlotIndex(0));
        game.autoAct(new FixedRandom(0));
        assertThat(game.isFinished()).isTrue();

        assertThatThrownBy(() -> game.autoAct(new FixedRandom(0)))
                .isInstanceOfSatisfying(BusinessException.class,
                        error -> assertThat(error.errorCode()).isEqualTo(ErrorCode.GAME_ALREADY_OVER));
    }
}
