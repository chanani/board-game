package com.boardgame.room.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.boardgame.game.event.GameCompletedEvent;
import com.boardgame.room.application.PresenceTracker;
import com.boardgame.room.application.RoomNotifier;
import com.boardgame.room.application.RoomService;
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

@SpringBootTest
@AutoConfigureMockMvc
@RecordApplicationEvents
@Import(DisconnectForfeitApiTest.ClockTestConfig.class)
class DisconnectForfeitApiTest {

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

    @Autowired
    private RoomService roomService;

    @MockitoBean
    private RoomNotifier notifier;

    private String openRoom(User host, User guest) throws Exception {
        String body = mockMvc.perform(post("/api/rooms").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"자동 기권 방\", \"gameType\": \"PAPER_SAFARI\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String code = JsonPath.read(body, "$.code");
        mockMvc.perform(post("/api/rooms/{code}/join", code).session(guest.session())).andExpect(status().isOk());
        return code;
    }

    private String startedRoom(User host, User guest) throws Exception {
        String code = openRoom(host, guest);
        mockMvc.perform(post("/api/rooms/{code}/ready", code).session(guest.session())
                .contentType(MediaType.APPLICATION_JSON).content("{\"ready\": true}")).andExpect(status().isOk());
        mockMvc.perform(post("/api/rooms/{code}/start", code).session(host.session())).andExpect(status().isOk());
        return code;
    }

    private void leave(User user, String code) throws Exception {
        mockMvc.perform(post("/api/rooms/{code}/leave", code).session(user.session()));
    }

    @Test
    void 게임_중_60초_넘게_끊긴_참가자는_기권되어_방에서_빠진다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String code = startedRoom(host, guest);
        presence.connected(host.id(), "s-host");
        presence.connected(guest.id(), "s-guest");
        presence.disconnected(guest.id(), "s-guest", clock.instant());
        clock.advance(Duration.ofSeconds(60));

        roomService.forfeitLongDisconnected();

        mockMvc.perform(get("/api/rooms/{code}", code).session(host.session()))
                .andExpect(jsonPath("$.status").value("WAITING"))
                .andExpect(jsonPath("$.members.length()").value(1));
        assertThat(events.stream(GameCompletedEvent.class)).hasSize(1);
        leave(host, code);
    }

    @Test
    void 오십구초면_그대로다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String code = startedRoom(host, guest);
        presence.connected(host.id(), "s-host");
        presence.connected(guest.id(), "s-guest");
        presence.disconnected(guest.id(), "s-guest", clock.instant());
        clock.advance(Duration.ofSeconds(59));

        roomService.forfeitLongDisconnected();

        mockMvc.perform(get("/api/rooms/{code}", code).session(host.session()))
                .andExpect(jsonPath("$.status").value("PLAYING"))
                .andExpect(jsonPath("$.members.length()").value(2));
        leave(guest, code);
        leave(host, code);
    }

    @Test
    void 다시_연결되면_그대로다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String code = startedRoom(host, guest);
        presence.connected(host.id(), "s-host");
        presence.connected(guest.id(), "s-guest");
        presence.disconnected(guest.id(), "s-guest", clock.instant());
        presence.connected(guest.id(), "s-guest2");
        clock.advance(Duration.ofSeconds(60));

        roomService.forfeitLongDisconnected();

        mockMvc.perform(get("/api/rooms/{code}", code).session(host.session()))
                .andExpect(jsonPath("$.status").value("PLAYING"))
                .andExpect(jsonPath("$.members.length()").value(2));
        leave(guest, code);
        leave(host, code);
    }

    @Test
    void 대기_중인_방의_끊긴_사람은_그대로다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String code = openRoom(host, guest);
        presence.connected(host.id(), "s-host");
        presence.connected(guest.id(), "s-guest");
        presence.disconnected(guest.id(), "s-guest", clock.instant());
        clock.advance(Duration.ofSeconds(60));

        roomService.forfeitLongDisconnected();

        mockMvc.perform(get("/api/rooms/{code}", code).session(host.session()))
                .andExpect(jsonPath("$.members.length()").value(2));
        leave(guest, code);
        leave(host, code);
    }

    @Test
    void 관전자는_대상이_아니다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        User third = ApiUsers.create(mockMvc);
        String code = startedRoom(host, guest);
        mockMvc.perform(post("/api/rooms/{code}/watch", code).session(third.session())).andExpect(status().isOk());
        presence.connected(host.id(), "s-host");
        presence.connected(guest.id(), "s-guest");
        presence.connected(third.id(), "s-third");
        presence.disconnected(third.id(), "s-third", clock.instant());
        clock.advance(Duration.ofSeconds(60));

        roomService.forfeitLongDisconnected();

        mockMvc.perform(get("/api/rooms/{code}", code).session(host.session()))
                .andExpect(jsonPath("$.status").value("PLAYING"))
                .andExpect(jsonPath("$.spectators.length()").value(1));
        leave(third, code);
        leave(guest, code);
        leave(host, code);
    }
}
