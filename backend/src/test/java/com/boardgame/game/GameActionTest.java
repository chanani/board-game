package com.boardgame.game;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class GameActionTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void 세_칸_생성자는_우노_칸을_비워_둔다() {
        GameAction action = new GameAction("FLIP", 0, 1);

        assertThat(action.cardId()).isNull();
        assertThat(action.color()).isNull();
        assertThat(action.targetId()).isNull();
        assertThat(action).isEqualTo(new GameAction("FLIP", 0, 1, null, null, null));
    }

    @Test
    void JSON의_우노_칸을_읽는다() throws Exception {
        GameAction play = mapper.readValue("{\"type\":\"PLAY\",\"cardId\":104,\"color\":\"GREEN\"}", GameAction.class);
        GameAction caught = mapper.readValue("{\"type\":\"CATCH_UNO\",\"targetId\":12}", GameAction.class);

        assertThat(play).isEqualTo(new GameAction("PLAY", null, null, 104, "GREEN", null));
        assertThat(caught.targetId()).isEqualTo(12L);
    }

    @Test
    void 페이퍼_사파리_JSON은_그대로_읽힌다() throws Exception {
        GameAction flip = mapper.readValue("{\"type\":\"FLIP\",\"column\":2,\"row\":1}", GameAction.class);

        assertThat(flip).isEqualTo(new GameAction("FLIP", 2, 1));
    }
}
