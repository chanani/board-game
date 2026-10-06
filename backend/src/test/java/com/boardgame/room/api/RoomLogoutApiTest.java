package com.boardgame.room.api;

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
class RoomLogoutApiTest {

    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private RoomNotifier notifier;

    private String open(User host) throws Exception {
        String body = mockMvc.perform(post("/api/rooms").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"로그아웃 방\", \"gameType\": \"PAPER_SAFARI\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.code");
    }

    private void join(User guest, String code) throws Exception {
        mockMvc.perform(post("/api/rooms/{code}/join", code).session(guest.session())).andExpect(status().isOk());
    }

    private void startWith(User host, User guest, String code) throws Exception {
        mockMvc.perform(post("/api/rooms/{code}/ready", code).session(guest.session())
                .contentType(MediaType.APPLICATION_JSON).content("{\"ready\": true}")).andExpect(status().isOk());
        mockMvc.perform(post("/api/rooms/{code}/start", code).session(host.session())).andExpect(status().isOk());
    }

    private void logout(User user) throws Exception {
        mockMvc.perform(post("/api/auth/logout").session(user.session())).andExpect(status().isNoContent());
    }

    @Test
    void 게임_중에_로그아웃하면_기권되어_남은_사람만_대기_중인_방에_남는다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String code = open(host);
        join(guest, code);
        startWith(host, guest, code);

        logout(guest);

        mockMvc.perform(get("/api/rooms/{code}", code).session(host.session()))
                .andExpect(jsonPath("$.status").value("WAITING"))
                .andExpect(jsonPath("$.members.length()").value(1));
        mockMvc.perform(post("/api/rooms/{code}/leave", code).session(host.session()));
    }

    @Test
    void 대기_중에_로그아웃하면_방에서_빠진다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String code = open(host);
        join(guest, code);

        logout(guest);

        mockMvc.perform(get("/api/rooms/{code}", code).session(host.session()))
                .andExpect(jsonPath("$.members.length()").value(1));
        mockMvc.perform(post("/api/rooms/{code}/leave", code).session(host.session()));
    }

    @Test
    void 관전_중에_로그아웃하면_관전만_끝나고_게임은_계속된다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        User watcher = ApiUsers.create(mockMvc);
        String code = open(host);
        join(guest, code);
        startWith(host, guest, code);
        mockMvc.perform(post("/api/rooms/{code}/watch", code).session(watcher.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.spectators.length()").value(1));

        logout(watcher);

        mockMvc.perform(get("/api/rooms/{code}", code).session(host.session()))
                .andExpect(jsonPath("$.status").value("PLAYING"))
                .andExpect(jsonPath("$.spectators.length()").value(0));
        mockMvc.perform(post("/api/rooms/{code}/leave", code).session(host.session()));
        mockMvc.perform(post("/api/rooms/{code}/leave", code).session(guest.session()));
    }

    @Test
    void 방이_없어도_그대로_로그아웃된다() throws Exception {
        User user = ApiUsers.create(mockMvc);

        logout(user);

        mockMvc.perform(get("/api/members/me").session(user.session())).andExpect(status().isUnauthorized());
    }
}
