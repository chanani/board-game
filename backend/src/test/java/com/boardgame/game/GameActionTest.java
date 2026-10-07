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

    @Test
    void JSON의_index_칸을_읽고_예전_생성자는_index를_비워_둔다() throws Exception {
        GameAction draw = mapper.readValue("{\"type\":\"DRAW\",\"index\":3}", GameAction.class);
        GameAction peekNone = mapper.readValue("{\"type\":\"PEEK\",\"index\":null}", GameAction.class);

        assertThat(draw.index()).isEqualTo(3);
        assertThat(peekNone.index()).isNull();
        assertThat(new GameAction("FLIP", 0, 1).index()).isNull();
        assertThat(new GameAction("PLAY", null, null, 104, "GREEN", null).index()).isNull();
        assertThat(new GameAction("PLAY", null, null, 104, "GREEN", null))
                .isEqualTo(new GameAction("PLAY", null, null, 104, "GREEN", null, null));
    }

    @Test
    void JSON의_cardIds_칸을_읽고_예전_생성자는_cardIds를_비워_둔다() throws Exception {
        GameAction discard = mapper.readValue("{\"type\":\"DISCARD\",\"cardIds\":[4,17]}", GameAction.class);

        assertThat(discard.cardIds()).containsExactly(4, 17);
        assertThat(new GameAction("DRAW", null, null, null, null, null, 3).cardIds()).isNull();
        assertThat(new GameAction("FLIP", 0, 1).cardIds()).isNull();
    }
}
