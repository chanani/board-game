package com.boardgame.fruitstack;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameAction;
import com.boardgame.support.MutableClock;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

class FruitStackViewTest {

    private static final Instant T0 = Instant.parse("2026-10-13T00:00:00Z");

    private final ObjectMapper mapper = new ObjectMapper();
    private final MutableClock clock = new MutableClock(T0);
    private final FruitStackSession session = new FruitStackSession(List.of(11L, 22L, 33L), new Seed(12345), clock);

    private static GameAction action(String type, int score) {
        return new GameAction(type, null, null, null, null, null, null, null, score, null);
    }

    private JsonNode gameOf(long viewer) {
        return mapper.valueToTree(session.viewFor(viewer)).get("game");
    }

    @Test
    void 진행_중_화면에_씨앗_점수_상태_마감이_실린다() {
        clock.advance(Duration.ofSeconds(5));
        session.act(11, action("SCORE", 20));
        session.act(22, action("OUT", 7));

        JsonNode root = mapper.valueToTree(session.viewFor(11));
        JsonNode game = root.get("game");

        assertThat(root.get("gameType").asText()).isEqualTo("FRUIT_STACK");
        assertThat(game.get("viewerId").asLong()).isEqualTo(11);
        assertThat(game.get("status").asText()).isEqualTo("IN_PROGRESS");
        assertThat(game.get("startedAt").asLong()).isEqualTo(T0.toEpochMilli());
        assertThat(game.get("seed").asInt()).isEqualTo(12345);
        assertThat(game.get("participantIds")).hasSize(3);
        assertThat(game.get("players").get(0).toString()).isEqualTo("{\"playerId\":11,\"score\":20,\"state\":\"PLAYING\"}");
        assertThat(game.get("players").get(1).toString()).isEqualTo("{\"playerId\":22,\"score\":7,\"state\":\"OUT\"}");
        assertThat(game.get("result").isNull()).isTrue();
        assertThat(game.get("winnerId").isNull()).isTrue();
        assertThat(game.get("deadline").asLong()).isEqualTo(T0.plusSeconds(600).toEpochMilli());
        assertThat(game.get("serverNow").asLong()).isEqualTo(T0.plusSeconds(5).toEpochMilli());
    }

    @Test
    void 참가자와_관전자의_화면은_보는_사람_말고_같다() {
        session.act(11, action("SCORE", 20));

        ObjectNode mine = (ObjectNode) gameOf(11);
        ObjectNode spectator = (ObjectNode) gameOf(999);

        assertThat(spectator.get("viewerId").asLong()).isEqualTo(999);
        mine.remove("viewerId");
        spectator.remove("viewerId");
        assertThat(spectator).isEqualTo(mine);
    }

    @Test
    void 끝난_화면에_이유와_등수_순_결과와_승자가_실리고_마감은_null이다() {
        session.act(33, action("SCORE", 50));
        session.act(11, action("OUT", 30));
        session.act(22, action("OUT", 40));

        JsonNode game = gameOf(22);

        assertThat(game.get("status").asText()).isEqualTo("GAME_OVER");
        assertThat(game.get("result").get("reason").asText()).isEqualTo("DECIDED");
        assertThat(game.get("result").get("standings").toString()).isEqualTo("["
                + "{\"playerId\":33,\"score\":50,\"outcome\":\"WIN\",\"rank\":1,\"state\":\"PLAYING\"},"
                + "{\"playerId\":22,\"score\":40,\"outcome\":\"LOSE\",\"rank\":2,\"state\":\"OUT\"},"
                + "{\"playerId\":11,\"score\":30,\"outcome\":\"LOSE\",\"rank\":3,\"state\":\"OUT\"}]");
        assertThat(game.get("winnerId").asLong()).isEqualTo(33);
        assertThat(game.get("deadline").isNull()).isTrue();
    }

    @Test
    void 무승부로_끝나면_승자는_null이다() {
        clock.advance(Duration.ofMinutes(10));
        session.autoAct(new Random());

        JsonNode game = gameOf(11);

        assertThat(game.get("result").get("reason").asText()).isEqualTo("TIME_UP");
        assertThat(game.get("winnerId").isNull()).isTrue();
        assertThat(game.get("result").get("standings").get(2).get("outcome").asText()).isEqualTo("DRAW");
    }
}
