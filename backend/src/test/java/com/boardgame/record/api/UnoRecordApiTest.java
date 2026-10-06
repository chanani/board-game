package com.boardgame.record.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.boardgame.game.GameCompleted;
import com.boardgame.game.GameType;
import com.boardgame.game.MatchEntry;
import com.boardgame.game.ResultType;
import com.boardgame.game.RoundCompleted;
import com.boardgame.game.RoundEntry;
import com.boardgame.game.event.GameCompletedEvent;
import com.boardgame.game.event.GameStartedEvent;
import com.boardgame.game.event.RoundCompletedEvent;
import com.boardgame.support.ApiUsers;
import com.boardgame.support.ApiUsers.User;
import com.jayway.jsonpath.JsonPath;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class UnoRecordApiTest {

    private static final Instant T0 = Instant.parse("2026-10-07T10:00:00Z");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ApplicationEventPublisher events;

    // UnoSession이 손패를 비워 끝날 때 내는 것과 같은 모양(R32): 이긴 사람 WIN + 얻은 점수, 진 사람 LOSE 0점, tokens 0.
    private void unoMatch(User winner, User loser, int points) {
        String key = UUID.randomUUID().toString();
        events.publishEvent(new GameStartedEvent(key, GameType.UNO, List.of(winner.id(), loser.id()), T0));
        events.publishEvent(new RoundCompletedEvent(key, GameType.UNO, new RoundCompleted(1, List.of(
                new RoundEntry(winner.id(), ResultType.WIN, points), new RoundEntry(loser.id(), ResultType.LOSE, 0)))));
        events.publishEvent(new GameCompletedEvent(key, GameType.UNO, T0, T0.plusSeconds(300), new GameCompleted(List.of(
                new MatchEntry(winner.id(), ResultType.WIN, 0, 0), new MatchEntry(loser.id(), ResultType.LOSE, 0, 1)))));
    }

    @Test
    void 우노_전적은_따로_쌓이고_평균은_얻은_점수의_평균이다() throws Exception {
        User alice = ApiUsers.create(mockMvc);
        User bob = ApiUsers.create(mockMvc);
        unoMatch(alice, bob, 47);

        mockMvc.perform(get("/api/records/me").session(alice.session()))
                .andExpect(jsonPath("$.stats[0].gameType").value("PAPER_SAFARI"))
                .andExpect(jsonPath("$.stats[0].matches").value(0))
                .andExpect(jsonPath("$.stats[1].gameType").value("UNO"))
                .andExpect(jsonPath("$.stats[1].gameTypeName").value("우노"))
                .andExpect(jsonPath("$.stats[1].wins").value(1))
                .andExpect(jsonPath("$.stats[1].averageRoundScore").value(47.0));
        mockMvc.perform(get("/api/records/me").session(bob.session()))
                .andExpect(jsonPath("$.stats[1].losses").value(1))
                .andExpect(jsonPath("$.stats[1].averageRoundScore").value(0.0));
        mockMvc.perform(get("/api/records/members/{id}/matches", alice.id()).param("gameType", "UNO").session(alice.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].gameType").value("UNO"))
                .andExpect(jsonPath("$[0].result").value("WIN"))
                .andExpect(jsonPath("$[0].rounds[0].score").value(47));
    }

    @Test
    void 실제_우노_방에서_기권으로_끝나도_전적에_반영되고_라운드는_없다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String created = mockMvc.perform(post("/api/rooms").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"우노 전적 방\", \"gameType\": \"UNO\"}"))
                .andReturn().getResponse().getContentAsString();
        String code = JsonPath.read(created, "$.code");
        mockMvc.perform(post("/api/rooms/{code}/join", code).session(guest.session()));
        mockMvc.perform(post("/api/rooms/{code}/ready", code).session(guest.session())
                .contentType(MediaType.APPLICATION_JSON).content("{\"ready\": true}"));
        mockMvc.perform(post("/api/rooms/{code}/start", code).session(host.session()));

        mockMvc.perform(post("/api/rooms/{code}/leave", code).session(guest.session()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/records/me").session(host.session()))
                .andExpect(jsonPath("$.stats[1].wins").value(1))
                .andExpect(jsonPath("$.stats[1].rounds").value(0));
        mockMvc.perform(get("/api/records/me").session(guest.session()))
                .andExpect(jsonPath("$.stats[1].losses").value(1));
        mockMvc.perform(post("/api/rooms/{code}/leave", code).session(host.session()));
    }
}
