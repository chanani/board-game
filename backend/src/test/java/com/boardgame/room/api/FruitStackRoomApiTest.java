package com.boardgame.room.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.boardgame.support.ApiUsers;
import com.boardgame.support.ApiUsers.User;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

@SpringBootTest
@AutoConfigureMockMvc
class FruitStackRoomApiTest {

    @Autowired
    private MockMvc mockMvc;

    private ResultActions create(User host, int maxPlayers) throws Exception {
        String body = "{\"name\": \"과일 방\", \"gameType\": \"FRUIT_STACK\", \"maxPlayers\": " + maxPlayers + "}";
        return mockMvc.perform(post("/api/rooms").session(host.session())
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private String codeOf(ResultActions created) throws Exception {
        return JsonPath.read(created.andReturn().getResponse().getContentAsString(), "$.code");
    }

    @Test
    void 수박게임_방은_1명부터_5명까지_만들고_6명과_0명은_거절한다() throws Exception {
        User host = ApiUsers.create(mockMvc);

        create(host, 6)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_CAPACITY"));
        create(host, 0)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_CAPACITY"));
        String solo = codeOf(create(host, 1).andExpect(status().isCreated()).andExpect(jsonPath("$.maxPlayers").value(1)));
        mockMvc.perform(post("/api/rooms/{code}/leave", solo).session(host.session()));
        ResultActions created = create(host, 5)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.gameType").value("FRUIT_STACK"))
                .andExpect(jsonPath("$.gameTypeName").value("수박게임"));
        mockMvc.perform(post("/api/rooms/{code}/leave", codeOf(created)).session(host.session()));
    }

    @Test
    void 두_명이_준비하고_시작하면_게임_중이_된다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String code = codeOf(create(host, 5).andExpect(status().isCreated()));
        mockMvc.perform(post("/api/rooms/{code}/join", code).session(guest.session()))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/rooms/{code}/ready", code).session(guest.session())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"ready\": true}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/rooms/{code}/start", code).session(host.session()))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/rooms/{code}", code).session(host.session()))
                .andExpect(jsonPath("$.status").value("PLAYING"))
                .andExpect(jsonPath("$.practice").value(false));
        mockMvc.perform(post("/api/rooms/{code}/leave", code).session(guest.session()));
        mockMvc.perform(post("/api/rooms/{code}/leave", code).session(host.session()));
    }

    @Test
    void S1_방장_혼자서도_시작하면_혼자_하기_게임이_된다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        String code = codeOf(create(host, 5).andExpect(status().isCreated()));

        mockMvc.perform(post("/api/rooms/{code}/start", code).session(host.session()))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/rooms/{code}", code).session(host.session()))
                .andExpect(jsonPath("$.status").value("PLAYING"))
                .andExpect(jsonPath("$.practice").value(false));
        mockMvc.perform(post("/api/rooms/{code}/leave", code).session(host.session()));
    }

    @Test
    void 다른_게임은_여전히_혼자_시작할_수_없다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        String body = "{\"name\": \"우노 방\", \"gameType\": \"UNO\"}";
        String code = codeOf(mockMvc.perform(post("/api/rooms").session(host.session())
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isCreated()));

        mockMvc.perform(post("/api/rooms/{code}/start", code).session(host.session()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("NOT_ENOUGH_PLAYERS"));
        mockMvc.perform(post("/api/rooms/{code}/leave", code).session(host.session()));
    }

    @Test
    void 로비_목록의_네_번째가_수박게임이다() throws Exception {
        User viewer = ApiUsers.create(mockMvc);

        mockMvc.perform(get("/api/games").session(viewer.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(4))
                .andExpect(jsonPath("$[3].gameType").value("FRUIT_STACK"));
    }
}
