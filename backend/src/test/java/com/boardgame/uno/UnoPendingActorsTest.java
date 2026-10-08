package com.boardgame.uno;

import static com.boardgame.uno.UnoColor.BLUE;
import static com.boardgame.uno.UnoColor.RED;
import static com.boardgame.uno.UnoFixtures.A;
import static com.boardgame.uno.UnoFixtures.B;
import static com.boardgame.uno.UnoFixtures.C;
import static com.boardgame.uno.UnoFixtures.filler;
import static com.boardgame.uno.UnoFixtures.game;
import static com.boardgame.uno.UnoFixtures.num;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameAction;
import com.boardgame.game.PendingActor;
import com.boardgame.game.PendingKind;
import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.game.bot.BotMind;
import com.boardgame.game.bot.BotPlan;
import com.boardgame.game.bot.BotSituation;
import com.boardgame.support.FixedRandom;
import com.boardgame.uno.bot.UnoBrain;
import com.boardgame.uno.view.UnoSessionView;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class UnoPendingActorsTest {

    private static final UnoCard FIRST = num(RED, 5);
    private static final List<List<UnoCard>> HANDS = List.of(
            List.of(num(RED, 1), num(RED, 2)),
            List.of(num(RED, 3), num(BLUE, 8)),
            List.of(num(RED, 4), num(BLUE, 9)));

    @Test
    void R18_차례인_사람과_잡기_창이_열리면_나머지_남은_사람이_반응을_기다린다() {
        UnoGame game = game(List.of(A, B, C), HANDS, FIRST, filler(20));
        assertThat(game.pendingActors()).containsExactly(PendingActor.turn(1L));

        game.play(A, num(RED, 1).id(), ChosenColor.none());

        assertThat(game.catchTarget()).contains(A);
        assertThat(game.pendingActors()).containsExactly(
                PendingActor.turn(2L), PendingActor.reaction(1L), PendingActor.reaction(3L));
    }

    @Test
    void R18_끝난_게임은_기다리는_사람이_없다() {
        UnoGame game = game(List.of(A, B), List.of(HANDS.get(0), HANDS.get(1)), FIRST, filler(20));

        game.forfeit(B);

        assertThat(game.isFinished()).isTrue();
        assertThat(game.pendingActors()).isEmpty();
    }

    @Test
    void 한_장이_된_컴퓨터는_반응으로_불려_자기_잡기_창에서_우노를_외치고_세션이_받아_준다() {
        UnoSession session = new UnoSession(List.of(A.value(), B.value(), C.value()), UnoFixtures.factory(HANDS, FIRST, filler(20), 0),
                Clock.systemUTC());
        session.act(A.value(), new GameAction("PLAY", null, null, num(RED, 1).id().value(), null, null));
        assertThat(session.pendingActors()).contains(PendingActor.reaction(A.value()));
        BotMind mind = new UnoBrain().mind(BotDifficulty.HARD);
        Object view = session.viewFor(A.value());
        mind.observe(view);

        BotPlan plan = mind.plan(new BotSituation(view, PendingKind.REACTION, Instant.EPOCH, new FixedRandom(0))).orElseThrow();
        session.act(A.value(), plan.first().action());

        assertThat(plan.first().action().type()).isEqualTo("CALL_UNO");
        UnoSessionView after = (UnoSessionView) session.viewFor(A.value());
        assertThat(after.game().unoCatch()).isNull();
        assertThat(after.game().players().get(0).unoDeclared()).isTrue();
        assertThat(session.pendingActors()).containsExactly(PendingActor.turn(B.value()));
    }
}
