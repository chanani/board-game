package com.boardgame.room.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.boardgame.room.application.RoomNotifier;
import com.boardgame.support.ApiUsers;
import com.boardgame.support.ApiUsers.User;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class GameLobbyApiTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RoomNotifier notifier;

    private int count(User user, String field) throws Exception {
        String body = mockMvc.perform(get("/api/games").session(user.session()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$[0]." + field);
    }

    private String createRoom(User host) throws Exception {
        String body = mockMvc.perform(post("/api/rooms").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"인원 방\", \"gameType\": \"PAPER_SAFARI\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.code");
    }

    @Test
    void 로그인하지_않으면_401() throws Exception {
        mockMvc.perform(get("/api/games"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void 게임_정보와_인원을_돌려준다() throws Exception {
        User viewer = ApiUsers.create(mockMvc);

        mockMvc.perform(get("/api/games").session(viewer.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].gameType").value("PAPER_SAFARI"))
                .andExpect(jsonPath("$[0].name").value("페이퍼 사파리"))
                .andExpect(jsonPath("$[0].minPlayers").value(2))
                .andExpect(jsonPath("$[0].maxPlayers").value(5))
                .andExpect(jsonPath("$[0].waitingPlayers").isNumber())
                .andExpect(jsonPath("$[0].playingPlayers").isNumber())
                .andExpect(jsonPath("$[1].gameType").value("UNO"))
                .andExpect(jsonPath("$[1].name").value("우노"))
                .andExpect(jsonPath("$[1].minPlayers").value(2))
                .andExpect(jsonPath("$[1].maxPlayers").value(5))
                .andExpect(jsonPath("$[2].gameType").value("OLD_MAID"))
                .andExpect(jsonPath("$[2].name").value("도둑잡기"))
                .andExpect(jsonPath("$[2].minPlayers").value(2))
                .andExpect(jsonPath("$[2].maxPlayers").value(6));
    }

    @Test
    void 방에_들어가면_대기_인원이_늘고_시작하면_플레이_인원으로_옮겨간다() throws Exception {
        User viewer = ApiUsers.create(mockMvc);
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        int waitingBefore = count(viewer, "waitingPlayers");
        int playingBefore = count(viewer, "playingPlayers");

        String code = createRoom(host);
        mockMvc.perform(post("/api/rooms/{code}/join", code).session(guest.session())).andExpect(status().isOk());
        assertThat(count(viewer, "waitingPlayers")).isEqualTo(waitingBefore + 2);

        mockMvc.perform(post("/api/rooms/{code}/ready", code).session(guest.session())
                .contentType(MediaType.APPLICATION_JSON).content("{\"ready\": true}")).andExpect(status().isOk());
        mockMvc.perform(post("/api/rooms/{code}/start", code).session(host.session())).andExpect(status().isOk());
        assertThat(count(viewer, "waitingPlayers")).isEqualTo(waitingBefore);
        assertThat(count(viewer, "playingPlayers")).isEqualTo(playingBefore + 2);
    }
}
