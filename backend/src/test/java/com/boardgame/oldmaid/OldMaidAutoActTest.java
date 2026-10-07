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

        PlayerId actor = game.autoAct(new FixedRandom(1));

        assertThat(actor).isEqualTo(A);
        assertThat(game.handOf(A)).containsExactly(JOKER, s(Rank.TWO), s(Rank.THREE));
        assertThat(game.latestEvents()).extracting(OldMaidEvent::type).containsExactly(OldMaidEventType.DRAW);
        assertThat(game.latestEvents()).allMatch(OldMaidEvent::auto);
        assertThat(game.drawer()).isEqualTo(B);
    }

    @Test
    void R35_자동으로_뽑은_카드도_짝이면_버린다() {
        OldMaidGame game = threePlayers();

        game.autoAct(new FixedRandom(5));

        assertThat(game.handOf(A)).containsExactly(s(Rank.THREE));
        assertThat(game.latestEvents()).extracting(OldMaidEvent::type)
                .containsExactly(OldMaidEventType.DRAW, OldMaidEventType.PAIR);
    }

    @Test
    void 끝난_게임은_자동_행동을_하지_않는다() {
        OldMaidGame game = game(A, hands(List.of(s(Rank.FIVE)), List.of(h(Rank.FIVE), JOKER)));
        game.draw(A, new SlotIndex(0));

        assertThatThrownBy(() -> game.autoAct(new FixedRandom(0)))
                .isInstanceOfSatisfying(BusinessException.class,
                        error -> assertThat(error.errorCode()).isEqualTo(ErrorCode.GAME_ALREADY_OVER));
    }
}
