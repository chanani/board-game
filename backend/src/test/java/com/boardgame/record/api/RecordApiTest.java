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
class RecordApiTest {

    private static final Instant T0 = Instant.parse("2026-10-05T10:00:00Z");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ApplicationEventPublisher events;

    // winner가 이기고 loser가 지는 한 판(라운드 1개 포함)을 기록한다. offsetMinutes로 종료 시각을 구분한다.
    private void playMatch(User winner, User loser, int offsetMinutes) {
        String key = UUID.randomUUID().toString();
        Instant started = T0.plusSeconds(offsetMinutes * 60L);
        Instant ended = started.plusSeconds(30);
        events.publishEvent(new GameStartedEvent(key, GameType.PAPER_SAFARI, List.of(winner.id(), loser.id()), started));
        events.publishEvent(new RoundCompletedEvent(key, GameType.PAPER_SAFARI, new RoundCompleted(1, List.of(
                new RoundEntry(winner.id(), ResultType.WIN, 1), new RoundEntry(loser.id(), ResultType.LOSE, 40)))));
        events.publishEvent(new GameCompletedEvent(key, GameType.PAPER_SAFARI, started, ended, new GameCompleted(List.of(
                new MatchEntry(winner.id(), ResultType.WIN, 3, 0), new MatchEntry(loser.id(), ResultType.LOSE, 0, 1)))));
    }

    @Test
    void 기록이_없으면_게임별로_0판과_null_승률을_보여준다() throws Exception {
        User user = ApiUsers.create(mockMvc);

        mockMvc.perform(get("/api/records/me").session(user.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.memberId").value(user.id()))
                .andExpect(jsonPath("$.nickname").value(user.nickname()))
                .andExpect(jsonPath("$.stats[0].gameType").value("PAPER_SAFARI"))
                .andExpect(jsonPath("$.stats[0].gameTypeName").value("페이퍼 사파리"))
                .andExpect(jsonPath("$.stats[0].matches").value(0))
                .andExpect(jsonPath("$.stats[0].winRate").isEmpty())
                .andExpect(jsonPath("$.stats[0].averageRoundScore").isEmpty());
    }

    @Test
    void 내_전적은_게임과_라운드의_승무패와_승률을_보여준다() throws Exception {
        User alice = ApiUsers.create(mockMvc);
        User bob = ApiUsers.create(mockMvc);
        playMatch(alice, bob, 0);
        playMatch(alice, bob, 1);
        playMatch(bob, alice, 2);

        mockMvc.perform(get("/api/records/me").session(alice.session()))
                .andExpect(jsonPath("$.stats[0].matches").value(3))
                .andExpect(jsonPath("$.stats[0].wins").value(2))
                .andExpect(jsonPath("$.stats[0].losses").value(1))
                .andExpect(jsonPath("$.stats[0].draws").value(0))
                .andExpect(jsonPath("$.stats[0].winRate").value(2.0 / 3))
                .andExpect(jsonPath("$.stats[0].rounds").value(3))
                .andExpect(jsonPath("$.stats[0].roundWins").value(2))
                .andExpect(jsonPath("$.stats[0].averageRoundScore").value(14.0));
    }

    @Test
    void 다른_회원의_전적을_볼_수_있고_없는_회원은_404() throws Exception {
        User alice = ApiUsers.create(mockMvc);
        User bob = ApiUsers.create(mockMvc);
        playMatch(bob, alice, 0);

        mockMvc.perform(get("/api/records/members/{id}", bob.id()).session(alice.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nickname").value(bob.nickname()))
                .andExpect(jsonPath("$.stats[0].wins").value(1));
        mockMvc.perform(get("/api/records/members/{id}", 999_999_999L).session(alice.session()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("MEMBER_NOT_FOUND"));
    }

    @Test
    void 최근_경기는_끝난_경기만_최신순으로_참가자와_라운드_결과를_보여준다() throws Exception {
        User alice = ApiUsers.create(mockMvc);
        User bob = ApiUsers.create(mockMvc);
        playMatch(alice, bob, 0);
        playMatch(bob, alice, 5);
        events.publishEvent(new GameStartedEvent(UUID.randomUUID().toString(), GameType.PAPER_SAFARI,
                List.of(alice.id(), bob.id()), T0.plusSeconds(3600)));

        mockMvc.perform(get("/api/records/members/{id}/matches", alice.id())
                        .param("gameType", "PAPER_SAFARI").param("limit", "10").session(alice.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].result").value("LOSE"))
                .andExpect(jsonPath("$[0].tokens").value(0))
                .andExpect(jsonPath("$[0].players[0].nickname").value(bob.nickname()))
                .andExpect(jsonPath("$[0].players[0].result").value("WIN"))
                .andExpect(jsonPath("$[0].players[1].nickname").value(alice.nickname()))
                .andExpect(jsonPath("$[0].rounds[0].roundNumber").value(1))
                .andExpect(jsonPath("$[0].rounds[0].result").value("LOSE"))
                .andExpect(jsonPath("$[0].rounds[0].score").value(40))
                .andExpect(jsonPath("$[1].result").value("WIN"))
                .andExpect(jsonPath("$[1].endedAt").value("2026-10-05T10:00:30Z"));

        mockMvc.perform(get("/api/records/members/{id}/matches", alice.id()).param("limit", "1")
                        .session(alice.session()))
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void 순위표는_5판_이상만_승률_순으로_보여준다() throws Exception {
        User alice = ApiUsers.create(mockMvc);
        User bob = ApiUsers.create(mockMvc);
        User carol = ApiUsers.create(mockMvc);
        for (int index = 0; index < 4; index++) {
            playMatch(alice, bob, index);
        }
        playMatch(bob, alice, 10);
        for (int index = 0; index < 4; index++) {
            playMatch(carol, bob, 20 + index);
        }

        String body = mockMvc.perform(get("/api/records/rankings").param("gameType", "PAPER_SAFARI")
                        .session(alice.session()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        List<Integer> aliceRank = JsonPath.read(body, "$[?(@.memberId == %d)].rank".formatted(alice.id()));
        List<Integer> bobRank = JsonPath.read(body, "$[?(@.memberId == %d)].rank".formatted(bob.id()));
        List<Object> carolRank = JsonPath.read(body, "$[?(@.memberId == %d)]".formatted(carol.id()));
        List<Double> aliceRate = JsonPath.read(body, "$[?(@.memberId == %d)].winRate".formatted(alice.id()));
        org.assertj.core.api.Assertions.assertThat(aliceRank).hasSize(1);
        org.assertj.core.api.Assertions.assertThat(bobRank).hasSize(1);
        org.assertj.core.api.Assertions.assertThat(aliceRank.get(0)).isLessThan(bobRank.get(0));
        org.assertj.core.api.Assertions.assertThat(aliceRate.get(0)).isEqualTo(0.8);
        org.assertj.core.api.Assertions.assertThat(carolRank).isEmpty();
    }

    @Test
    void 없는_회원의_최근_경기는_404() throws Exception {
        User alice = ApiUsers.create(mockMvc);

        mockMvc.perform(get("/api/records/members/{id}/matches", 999_999_999L).session(alice.session()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("MEMBER_NOT_FOUND"));
    }

    @Test
    void 승률이_같으면_판수가_많은_사람이_위다() throws Exception {
        User dave = ApiUsers.create(mockMvc);
        User erin = ApiUsers.create(mockMvc);
        User fillerOne = ApiUsers.create(mockMvc);
        User fillerTwo = ApiUsers.create(mockMvc);
        for (int index = 0; index < 4; index++) {
            playMatch(dave, fillerOne, index);
        }
        playMatch(fillerOne, dave, 10);
        for (int index = 0; index < 8; index++) {
            playMatch(erin, fillerTwo, 20 + index);
        }
        playMatch(fillerTwo, erin, 40);
        playMatch(fillerTwo, erin, 41);

        String body = mockMvc.perform(get("/api/records/rankings").param("gameType", "PAPER_SAFARI")
                        .session(dave.session()))
                .andReturn().getResponse().getContentAsString();

        List<Integer> daveRank = JsonPath.read(body, "$[?(@.memberId == %d)].rank".formatted(dave.id()));
        List<Integer> erinRank = JsonPath.read(body, "$[?(@.memberId == %d)].rank".formatted(erin.id()));
        org.assertj.core.api.Assertions.assertThat(erinRank.get(0)).isLessThan(daveRank.get(0));
    }

    @Test
    void 실제_방에서_기권으로_끝난_게임도_전적에_반영된다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String created = mockMvc.perform(post("/api/rooms").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"전적 방\", \"gameType\": \"PAPER_SAFARI\"}"))
                .andReturn().getResponse().getContentAsString();
        String code = JsonPath.read(created, "$.code");
        mockMvc.perform(post("/api/rooms/{code}/join", code).session(guest.session()));
        mockMvc.perform(post("/api/rooms/{code}/start", code).session(host.session()));

        mockMvc.perform(post("/api/rooms/{code}/leave", code).session(guest.session()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/records/me").session(host.session()))
                .andExpect(jsonPath("$.stats[0].wins").value(1));
        mockMvc.perform(get("/api/records/me").session(guest.session()))
                .andExpect(jsonPath("$.stats[0].losses").value(1));
        mockMvc.perform(post("/api/rooms/{code}/leave", code).session(host.session()));
    }

    @Test
    void 로그인하지_않으면_401() throws Exception {
        mockMvc.perform(get("/api/records/me"))
                .andExpect(status().isUnauthorized());
    }
}
