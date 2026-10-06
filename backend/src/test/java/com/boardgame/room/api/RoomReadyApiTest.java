package com.boardgame.room.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.boardgame.room.application.RoomNotifier;
import com.boardgame.support.ApiUsers;
import com.boardgame.support.ApiUsers.User;
import com.jayway.jsonpath.JsonPath;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
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
class RoomReadyApiTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RoomNotifier notifier;

    private final List<User> users = new ArrayList<>();

    @AfterEach
    void leaveAllRooms() throws Exception {
        for (User user : users) {
            leaveCurrentRoom(user);
        }
    }

    private void leaveCurrentRoom(User user) throws Exception {
        String body = mockMvc.perform(get("/api/rooms/me").session(user.session()))
                .andReturn().getResponse().getContentAsString();
        if (body.isEmpty()) {
            return;
        }
        String code = JsonPath.read(body, "$.code");
        mockMvc.perform(post("/api/rooms/{code}/leave", code).session(user.session()));
    }

    private User user() throws Exception {
        User user = ApiUsers.create(mockMvc);
        users.add(user);
        return user;
    }

    private String createRoom(User host) throws Exception {
        String body = mockMvc.perform(post("/api/rooms").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"준비 방\", \"gameType\": \"PAPER_SAFARI\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.code");
    }

    private ResultActions join(User user, String code) throws Exception {
        return mockMvc.perform(post("/api/rooms/{code}/join", code).session(user.session()));
    }

    private ResultActions ready(User user, String code, String body) throws Exception {
        return mockMvc.perform(post("/api/rooms/{code}/ready", code).session(user.session())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private ResultActions start(User user, String code) throws Exception {
        return mockMvc.perform(post("/api/rooms/{code}/start", code).session(user.session()));
    }

    @Test
    void 준비를_토글하면_멤버_응답의_ready에_반영된다() throws Exception {
        User host = user();
        User guest = user();
        String code = createRoom(host);
        join(guest, code).andExpect(status().isOk());

        ready(guest, code, "{\"ready\": true}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.members[0].ready").value(false))
                .andExpect(jsonPath("$.members[1].ready").value(true));
        ready(guest, code, "{\"ready\": false}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.members[1].ready").value(false));
    }

    @Test
    void ready가_없거나_방장이_보내면_400_INVALID_INPUT() throws Exception {
        User host = user();
        User guest = user();
        String code = createRoom(host);
        join(guest, code).andExpect(status().isOk());

        ready(guest, code, "{}").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        ready(host, code, "{\"ready\": true}").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void 방에_없는_사람은_NOT_IN_ROOM() throws Exception {
        User host = user();
        User outsider = user();
        String code = createRoom(host);

        ready(outsider, code, "{\"ready\": true}").andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_IN_ROOM"));
    }

    @Test
    void 준비_전에_시작하면_409_PLAYERS_NOT_READY이고_준비하면_시작되며_준비가_초기화된다() throws Exception {
        User host = user();
        User guest = user();
        String code = createRoom(host);
        join(guest, code).andExpect(status().isOk());

        start(host, code).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PLAYERS_NOT_READY"));
        ready(guest, code, "{\"ready\": true}").andExpect(status().isOk());
        start(host, code).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PLAYING"))
                .andExpect(jsonPath("$.members[1].ready").value(false));
        ready(guest, code, "{\"ready\": true}").andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ROOM_ALREADY_PLAYING"));
    }
}
