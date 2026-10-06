package com.boardgame.room.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
import org.springframework.test.web.servlet.ResultActions;

@SpringBootTest
@AutoConfigureMockMvc
class RoomSettingsApiTest {

    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private RoomNotifier notifier;

    private String open(User host) throws Exception {
        String body = mockMvc.perform(post("/api/rooms").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"설정방\",\"gameType\":\"PAPER_SAFARI\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.code");
    }

    private ResultActions update(User user, String code, String json) throws Exception {
        return mockMvc.perform(patch("/api/rooms/{code}/settings", code).session(user.session())
                .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private void leave(User user, String code) throws Exception {
        mockMvc.perform(post("/api/rooms/{code}/leave", code).session(user.session()));
    }

    @Test
    void 방장이_인원과_테마를_바꾸면_방_응답과_목록에_반영된다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        String code = open(host);

        update(host, code, "{\"maxPlayers\":3,\"theme\":\"BEACH\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.maxPlayers").value(3))
                .andExpect(jsonPath("$.theme").value("BEACH"));
        mockMvc.perform(get("/api/rooms").session(host.session()))
                .andExpect(jsonPath("$[?(@.code == '%s')].theme".formatted(code)).value("BEACH"));
        leave(host, code);
    }

    @Test
    void 방장이_아니면_403_NOT_ROOM_HOST() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String code = open(host);
        mockMvc.perform(post("/api/rooms/{code}/join", code).session(guest.session())).andExpect(status().isOk());

        update(guest, code, "{\"maxPlayers\":3,\"theme\":\"WOOD\"}")
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_ROOM_HOST"));
        leave(guest, code);
        leave(host, code);
    }

    @Test
    void 참가자보다_적게_줄이면_409_CAPACITY_BELOW_PLAYERS() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        User third = ApiUsers.create(mockMvc);
        String code = open(host);
        mockMvc.perform(post("/api/rooms/{code}/join", code).session(guest.session())).andExpect(status().isOk());
        mockMvc.perform(post("/api/rooms/{code}/join", code).session(third.session())).andExpect(status().isOk());

        update(host, code, "{\"maxPlayers\":2,\"theme\":\"WOOD\"}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.code").value("CAPACITY_BELOW_PLAYERS"))
                .andExpect(jsonPath("$.message").value("지금 있는 인원보다 적게 줄일 수 없어요."));
        leave(third, code);
        leave(guest, code);
        leave(host, code);
    }

    @Test
    void 범위_밖_인원_모르는_테마_빠진_값은_400() throws Exception {
        User host = ApiUsers.create(mockMvc);
        String code = open(host);

        update(host, code, "{\"maxPlayers\":9,\"theme\":\"WOOD\"}").andExpect(jsonPath("$.code").value("INVALID_CAPACITY"));
        update(host, code, "{\"maxPlayers\":3,\"theme\":\"BLOSSOM\"}").andExpect(jsonPath("$.code").value("INVALID_THEME"));
        update(host, code, "{\"theme\":\"WOOD\"}").andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        update(host, code, "{\"maxPlayers\":3}").andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        leave(host, code);
    }
}
