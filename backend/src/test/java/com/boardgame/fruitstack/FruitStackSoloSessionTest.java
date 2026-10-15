package com.boardgame.fruitstack;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameAction;
import com.boardgame.game.GameOutcome;
import com.boardgame.game.SoloCompleted;
import com.boardgame.support.MutableClock;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

// 혼자 하기의 세션 계약(스펙 12장): 결과는 최고 점수 기록 하나, 마감은 방치 마감, 화면에 남은 시간이 없다.
class FruitStackSoloSessionTest {

    private static final Instant T0 = Instant.parse("2026-10-13T00:00:00Z");
    private static final long A = 11;

    private final MutableClock clock = new MutableClock(T0);
    private final FruitStackSession session = new FruitStackSession(List.of(A), new Seed(12345), clock);
    private final ObjectMapper mapper = new ObjectMapper();

    private static GameAction action(String type, Integer score, String board) {
        return new GameAction(type, null, null, null, null, null, null, null, score, board);
    }

    @Test
    void S6_탈락으로_끝나면_승패_기록_없이_혼자_하기_점수_하나만_낸다() {
        clock.advance(Duration.ofSeconds(20));
        session.act(A, action("SCORE", 40, null));

        List<GameOutcome> outcomes = session.act(A, action("OUT", 45, null));

        assertThat(outcomes).containsExactly(new SoloCompleted(A, 45));
        assertThat(session.isFinished()).isTrue();
    }

    @Test
    void S5_S6_나가서_끝나도_그때까지의_점수를_낸다() {
        clock.advance(Duration.ofSeconds(20));
        session.act(A, action("SCORE", 40, null));

        assertThat(session.forfeit(A)).containsExactly(new SoloCompleted(A, 40));
    }

    @Test
    void S4_S6_방치되어_끝나도_그때까지의_점수를_내고_이른_호출은_빈_결과다() {
        clock.advance(Duration.ofSeconds(20));
        session.act(A, action("SCORE", 40, null));
        clock.advance(Duration.ofMinutes(4));
        assertThat(session.autoAct(new Random())).isEmpty();
        assertThat(session.deadline()).contains(T0.plusSeconds(20).plus(Duration.ofMinutes(5)));

        clock.advance(Duration.ofMinutes(1));

        assertThat(session.autoAct(new Random())).containsExactly(new SoloCompleted(A, 40));
        assertThat(session.deadline()).isEmpty();
    }

    @Test
    void S4_판_신호도_방치_마감을_늦춘다() {
        clock.advance(Duration.ofMinutes(4));
        session.signal(A, action("BOARD", null, "WAAAA"));

        assertThat(session.deadline()).contains(T0.plus(Duration.ofMinutes(9)));
    }

    @Test
    void S6_혼자_하기는_경기_기록을_남기지_않고_대결은_남긴다() {
        assertThat(session.recordsMatch()).isFalse();
        assertThat(new FruitStackSession(List.of(A, 22L), new Seed(1), clock).recordsMatch()).isTrue();
    }

    @Test
    void S3_화면의_deadline은_비어_있다() {
        JsonNode game = mapper.valueToTree(session.viewFor(A)).get("game");

        assertThat(game.get("deadline").isNull()).isTrue();
        assertThat(game.get("participantIds")).hasSize(1);
        assertThat(game.get("status").asText()).isEqualTo("IN_PROGRESS");
    }
}
