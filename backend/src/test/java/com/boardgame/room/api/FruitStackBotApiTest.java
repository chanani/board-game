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

@SpringBootTest
@AutoConfigureMockMvc
class FruitStackBotApiTest {

    @Autowired
    private MockMvc mockMvc;

    private String create(User host, String gameType) throws Exception {
        String body = mockMvc.perform(post("/api/rooms").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"방\", \"gameType\": \"" + gameType + "\", \"maxPlayers\": 4}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.code");
    }

    @Test
    void R35_과일_쌓기_방에_컴퓨터를_앉히면_409_BOTS_NOT_SUPPORTED() throws Exception {
        User host = ApiUsers.create(mockMvc);
        String code = create(host, "FRUIT_STACK");

        mockMvc.perform(post("/api/rooms/" + code + "/bots").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"difficulty\": \"EASY\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.code").value("BOTS_NOT_SUPPORTED"))
                .andExpect(jsonPath("$.message").value("이 게임은 컴퓨터와 할 수 없어요."));
        mockMvc.perform(get("/api/rooms/" + code).session(host.session()))
                .andExpect(jsonPath("$.members.length()").value(1))
                .andExpect(jsonPath("$.practice").value(false));
        mockMvc.perform(post("/api/rooms/" + code + "/leave").session(host.session()));
    }

    @Test
    void R35_방장이_아니면_컴퓨터_지원_여부보다_먼저_403이다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String code = create(host, "FRUIT_STACK");
        mockMvc.perform(post("/api/rooms/" + code + "/join").session(guest.session())).andExpect(status().isOk());

        mockMvc.perform(post("/api/rooms/" + code + "/bots").session(guest.session())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"difficulty\": \"EASY\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_ROOM_HOST"));
        mockMvc.perform(post("/api/rooms/" + code + "/leave").session(guest.session()));
        mockMvc.perform(post("/api/rooms/" + code + "/leave").session(host.session()));
    }

    @Test
    void 다른_게임_방은_그대로_컴퓨터를_받는다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        String code = create(host, "UNO");

        mockMvc.perform(post("/api/rooms/" + code + "/bots").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"difficulty\": \"EASY\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.members.length()").value(2));
        mockMvc.perform(post("/api/rooms/" + code + "/leave").session(host.session()));
    }
}
