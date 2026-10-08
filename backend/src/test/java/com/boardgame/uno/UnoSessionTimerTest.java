package com.boardgame.uno;

import static com.boardgame.uno.UnoColor.BLUE;
import static com.boardgame.uno.UnoColor.GREEN;
import static com.boardgame.uno.UnoColor.RED;
import static com.boardgame.uno.UnoFixtures.filler;
import static com.boardgame.uno.UnoFixtures.num;
import static com.boardgame.uno.UnoFixtures.skip;
import static com.boardgame.uno.UnoFixtures.wildFour;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameAction;
import com.boardgame.support.MutableClock;
import com.boardgame.uno.view.UnoSessionView;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

class UnoSessionTimerTest {

    private static final Instant T0 = Instant.parse("2026-10-07T00:00:00Z");
    private static final long A = 1L;
    private static final long B = 2L;
    private static final long C = 3L;
    private static final List<List<UnoCard>> HANDS = List.of(
            List.of(num(RED, 1), num(RED, 2)), List.of(num(RED, 3), num(BLUE, 8)), List.of(num(RED, 4), num(BLUE, 9)));

    private final MutableClock clock = new MutableClock(T0);

    private UnoSession session(List<Long> ids, List<List<UnoCard>> hands, List<UnoCard> pile) {
        return new UnoSession(ids, UnoFixtures.factory(hands, num(RED, 5), pile, 0), clock);
    }

    private UnoSession threePlayers() {
        return session(List.of(A, B, C), HANDS, filler(20));
    }

    private void after(int seconds) {
        clock.advance(Duration.ofSeconds(seconds));
    }

    private static GameAction play(UnoCard card) {
        return new GameAction("PLAY", null, null, card.id().value(), null, null);
    }

    private static GameAction action(String type) {
        return new GameAction(type, null, null);
    }

    private static Instant at(int seconds) {
        return T0.plusSeconds(seconds);
    }

    @Test
    void 시작하면_15초_뒤가_마감이다() {
        assertThat(threePlayers().deadline()).contains(at(15));
    }

    @Test
    void 같은_사람이라도_단계가_바뀌면_다시_15초다() {
        List<UnoCard> pile = new ArrayList<>(List.of(num(RED, 9)));
        pile.addAll(filler(10));
        UnoSession session = session(List.of(A, B, C), HANDS, pile);
        after(5);

        session.act(A, action("DRAW"));

        assertThat(session.deadline()).contains(at(20));
    }

    @Test
    void 차례가_바뀌면_다시_15초다() {
        UnoSession session = threePlayers();
        after(5);

        session.act(A, play(num(RED, 1)));

        assertThat(session.deadline()).contains(at(20));
    }

    @Test
    void 외치기와_잡기와_늦은_외치기는_마감을_바꾸지_않는다() {
        UnoSession session = threePlayers();
        after(2);
        session.act(A, action("CALL_UNO"));
        assertThat(session.deadline()).contains(at(15));
        after(2);
        session.act(A, play(num(RED, 1)));
        assertThat(session.deadline()).contains(at(19));
        after(2);
        session.act(B, play(num(RED, 3)));
        assertThat(session.deadline()).contains(at(21));
        after(2);
        session.act(B, action("CALL_UNO"));
        assertThat(session.deadline()).contains(at(21));
        after(2);
        session.act(C, play(num(RED, 4)));
        assertThat(session.deadline()).contains(at(25));
        after(1);

        session.act(A, new GameAction("CATCH_UNO", null, null, null, null, C));

        assertThat(session.deadline()).contains(at(25));
    }

    @Test
    void 다른_사람의_기권은_마감을_바꾸지_않는다() {
        UnoSession session = threePlayers();
        after(5);

        session.forfeit(C);

        assertThat(session.deadline()).contains(at(15));
    }

    @Test
    void 차례인_사람이_기권하면_다음_사람은_15초부터다() {
        UnoSession session = threePlayers();
        after(5);

        session.forfeit(A);

        assertThat(session.deadline()).contains(at(20));
    }

    @Test
    void R15_2명에서_SKIP으로_같은_사람이_다시_하면_15초부터() {
        UnoSession session = session(List.of(A, B), List.of(List.of(skip(RED), num(RED, 2)), List.of(num(GREEN, 1), num(GREEN, 2))), filler(10));
        after(5);

        session.act(A, play(skip(RED)));

        assertThat(session.deadline()).contains(at(20));
    }

    @Test
    void R18_와일드_4로_건너뛴_다음_사람의_PLAY도_15초부터() {
        UnoSession session = session(List.of(A, B, C), List.of(
                List.of(wildFour(0), num(RED, 1)), List.of(num(GREEN, 2), num(GREEN, 3)), List.of(num(GREEN, 4), num(GREEN, 6))), filler(10));
        after(3);

        session.act(A, new GameAction("PLAY", null, null, wildFour(0).id().value(), "GREEN", null));

        assertThat(session.deadline()).contains(at(18));
    }

    @Test
    void 시간_초과_자동_행동으로_차례가_넘어가면_15초부터다() {
        UnoSession session = threePlayers();
        after(15);

        session.autoAct(new Random());

        assertThat(session.deadline()).contains(at(30));
    }

    @Test
    void 끝나면_마감이_비어_있고_화면의_deadline도_null이다() {
        UnoSession session = session(List.of(A, B), List.of(List.of(num(RED, 1)), List.of(num(GREEN, 1))), filler(5));
        after(3);

        session.forfeit(B);

        assertThat(session.deadline()).isEmpty();
        UnoSessionView view = (UnoSessionView) session.viewFor(A);
        assertThat(view.game().deadline()).isNull();
        assertThat(view.game().serverNow()).isEqualTo(at(3).toEpochMilli());
    }

    @Test
    void 화면의_deadline과_serverNow는_epoch_ms다() {
        UnoSession session = threePlayers();
        after(3);

        UnoSessionView view = (UnoSessionView) session.viewFor(A);

        assertThat(view.game().deadline()).isEqualTo(at(15).toEpochMilli());
        assertThat(view.game().serverNow()).isEqualTo(at(3).toEpochMilli());
        assertThat(view.game().startedAt()).isEqualTo(T0.toEpochMilli());
    }
}
