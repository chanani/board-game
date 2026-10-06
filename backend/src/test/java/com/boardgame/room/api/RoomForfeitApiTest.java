package com.boardgame.room.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.boardgame.game.MatchEntry;
import com.boardgame.game.ResultType;
import com.boardgame.game.event.GameCompletedEvent;
import com.boardgame.room.application.PresenceTracker;
import com.boardgame.room.application.RoomNotifier;
import com.boardgame.support.ApiUsers;
import com.boardgame.support.ApiUsers.User;
import com.boardgame.support.MutableClock;
import com.jayway.jsonpath.JsonPath;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

@SpringBootTest
@AutoConfigureMockMvc
@RecordApplicationEvents
@Import(RoomForfeitApiTest.ClockTestConfig.class)
class RoomForfeitApiTest {

    @TestConfiguration
    static class ClockTestConfig {

        @Bean
        @Primary
        MutableClock mutableClock() {
            return new MutableClock(Instant.parse("2026-10-05T10:00:00Z"));
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ApplicationEvents events;

    @Autowired
    private PresenceTracker presence;

    @Autowired
    private MutableClock clock;

    @MockitoBean
    private RoomNotifier notifier;

    private String startedRoom(User host, User guest) throws Exception {
        String body = mockMvc.perform(post("/api/rooms").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"기권 방\", \"gameType\": \"PAPER_SAFARI\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String code = JsonPath.read(body, "$.code");
        mockMvc.perform(post("/api/rooms/{code}/join", code).session(guest.session())).andExpect(status().isOk());
        mockMvc.perform(post("/api/rooms/{code}/ready", code).session(guest.session())
                .contentType(MediaType.APPLICATION_JSON).content("{\"ready\": true}")).andExpect(status().isOk());
        mockMvc.perform(post("/api/rooms/{code}/start", code).session(host.session())).andExpect(status().isOk());
        return code;
    }

    private ResultActions forfeit(User requester, String code, User target) throws Exception {
        return mockMvc.perform(post("/api/rooms/{code}/members/{memberId}/forfeit", code, target.id())
                .session(requester.session()));
    }

    @Test
    void 끊긴_지_60초가_지나야_기권_처리할_수_있다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String code = startedRoom(host, guest);
        presence.connected(host.id(), "h1");
        presence.connected(guest.id(), "g1");
        presence.disconnected(guest.id(), "g1", clock.instant());

        clock.advance(Duration.ofSeconds(30));
        mockMvc.perform(get("/api/rooms/{code}", code).session(host.session()))
                .andExpect(jsonPath("$.members[1].connected").value(false))
                .andExpect(jsonPath("$.members[1].offlineSeconds").value(30))
                .andExpect(jsonPath("$.members[0].connected").value(true));
        forfeit(host, code, guest)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("FORFEIT_NOT_ALLOWED_YET"));

        clock.advance(Duration.ofSeconds(31));
        forfeit(host, code, guest).andExpect(status().isNoContent());

        assertThat(events.stream(GameCompletedEvent.class))
                .filteredOn(event -> event.result().entries().stream().anyMatch(entry -> entry.memberId() == guest.id()))
                .singleElement()
                .satisfies(event -> assertThat(event.result().entries()).containsExactly(
                        new MatchEntry(host.id(), ResultType.WIN, 0, 0),
                        new MatchEntry(guest.id(), ResultType.LOSE, 0, 1)));
        mockMvc.perform(get("/api/rooms/{code}", code).session(host.session()))
                .andExpect(jsonPath("$.status").value("WAITING"))
                .andExpect(jsonPath("$.members.length()").value(1));
    }

    @Test
    void 연결된_사람은_기권_처리할_수_없다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String code = startedRoom(host, guest);
        presence.connected(guest.id(), "g1");

        clock.advance(Duration.ofMinutes(5));

        forfeit(host, code, guest)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("FORFEIT_NOT_ALLOWED_YET"));
    }

    @Test
    void 방_참가자가_아니면_기권_처리를_요청할_수_없다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        User stranger = ApiUsers.create(mockMvc);
        String code = startedRoom(host, guest);

        forfeit(stranger, code, guest)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_IN_ROOM"));
    }

    @Test
    void 게임에_참여하지_않는_사람은_기권_대상이_아니다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        User stranger = ApiUsers.create(mockMvc);
        String code = startedRoom(host, guest);

        forfeit(host, code, stranger)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_A_PLAYER"));
    }

    @Test
    void 연결하지_않은_참가자도_게임_시작_60초_뒤에는_기권_처리된다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String code = startedRoom(host, guest);

        clock.advance(Duration.ofSeconds(59));
        forfeit(host, code, guest)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("FORFEIT_NOT_ALLOWED_YET"));

        clock.advance(Duration.ofSeconds(1));
        forfeit(host, code, guest).andExpect(status().isNoContent());
        mockMvc.perform(get("/api/rooms/{code}", code).session(host.session()))
                .andExpect(jsonPath("$.status").value("WAITING"));
    }

    @Test
    void 대기_중인_방에서_끊긴_방장을_내보낼_수_있다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String body = mockMvc.perform(post("/api/rooms").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"대기 방\", \"gameType\": \"PAPER_SAFARI\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String code = JsonPath.read(body, "$.code");
        mockMvc.perform(post("/api/rooms/{code}/join", code).session(guest.session())).andExpect(status().isOk());
        presence.connected(host.id(), "h1");
        presence.disconnected(host.id(), "h1", clock.instant());

        clock.advance(Duration.ofSeconds(61));
        forfeit(guest, code, host).andExpect(status().isNoContent());

        mockMvc.perform(get("/api/rooms/{code}", code).session(guest.session()))
                .andExpect(jsonPath("$.hostId").value(guest.id()))
                .andExpect(jsonPath("$.members.length()").value(1));
    }

    @Test
    void 정확히_60초가_지나면_기권_처리할_수_있다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String code = startedRoom(host, guest);
        presence.connected(guest.id(), "g1");
        presence.disconnected(guest.id(), "g1", clock.instant());

        clock.advance(Duration.ofSeconds(60));

        forfeit(host, code, guest).andExpect(status().isNoContent());
    }
}
