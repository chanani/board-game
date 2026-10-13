package com.boardgame.fruitstack;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.fruitstack.view.FruitStackBoardSignal;
import com.boardgame.fruitstack.view.FruitStackPlayerView;
import com.boardgame.fruitstack.view.FruitStackResultView;
import com.boardgame.fruitstack.view.FruitStackSessionView;
import com.boardgame.fruitstack.view.FruitStackStandingView;
import com.boardgame.fruitstack.view.FruitStackView;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.Test;

class FruitStackContractTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void 진행_중_화면의_칸_이름과_값() {
        FruitStackView game = new FruitStackView(7, "IN_PROGRESS", 1791900000000L, 12345, List.of(7L, 12L),
                List.of(new FruitStackPlayerView(7, 128, "PLAYING"), new FruitStackPlayerView(12, 311, "OUT")),
                null, null, 1791900600000L, 1791900123120L);

        JsonNode json = mapper.valueToTree(new FruitStackSessionView(game));

        assertThat(json.get("gameType").asText()).isEqualTo("FRUIT_STACK");
        JsonNode node = json.get("game");
        assertThat(node.fieldNames()).toIterable().containsExactly("viewerId", "status", "startedAt", "seed",
                "participantIds", "players", "result", "winnerId", "deadline", "serverNow");
        assertThat(node.get("seed").asInt()).isEqualTo(12345);
        assertThat(node.get("players").get(1).fieldNames()).toIterable().containsExactly("playerId", "score", "state");
        assertThat(node.get("result").isNull()).isTrue();
        assertThat(node.get("deadline").asLong()).isEqualTo(1791900600000L);
    }

    @Test
    void 끝난_화면의_결과_칸() {
        FruitStackResultView result = new FruitStackResultView("DECIDED",
                List.of(new FruitStackStandingView(7, 320, "WIN", 1, "PLAYING"),
                        new FruitStackStandingView(12, 311, "LOSE", 2, "OUT")));
        FruitStackView game = new FruitStackView(7, "GAME_OVER", 1791900000000L, 12345, List.of(7L, 12L),
                List.of(new FruitStackPlayerView(7, 320, "PLAYING"), new FruitStackPlayerView(12, 311, "OUT")),
                result, 7L, null, 1791900200000L);

        JsonNode node = mapper.valueToTree(new FruitStackSessionView(game)).get("game");

        assertThat(node.get("result").get("reason").asText()).isEqualTo("DECIDED");
        assertThat(node.get("result").get("standings").get(0).fieldNames()).toIterable()
                .containsExactly("playerId", "score", "outcome", "rank", "state");
        assertThat(node.get("winnerId").asLong()).isEqualTo(7L);
        assertThat(node.get("deadline").isNull()).isTrue();
    }

    @Test
    void 중계되는_판_신호의_칸() {
        JsonNode json = mapper.valueToTree(FruitStackBoardSignal.of(1791900000000L, 12, 418, "WAAAAGAPqA"));

        assertThat(json.fieldNames()).toIterable()
                .containsExactly("gameType", "type", "startedAt", "playerId", "seq", "board");
        assertThat(json.get("gameType").asText()).isEqualTo("FRUIT_STACK");
        assertThat(json.get("type").asText()).isEqualTo("BOARD");
        assertThat(json.get("board").asText()).isEqualTo("WAAAAGAPqA");
    }
}
