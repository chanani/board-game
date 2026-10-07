package com.boardgame.room.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.boardgame.support.ApiUsers;
import com.boardgame.support.ApiUsers.User;
import com.jayway.jsonpath.JsonPath;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class OldMaidRoomApiTest {

    @Autowired
    private MockMvc mockMvc;

    private String create(User host, int maxPlayers) throws Exception {
        String body = "{\"name\": \"도둑잡기\", \"gameType\": \"OLD_MAID\", \"maxPlayers\": " + maxPlayers + "}";
        String created = mockMvc.perform(post("/api/rooms").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.maxPlayers").value(maxPlayers))
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(created, "$.code");
    }

    @Test
    void D1_도둑잡기_방은_6명까지_만들고_7명은_거절한다() throws Exception {
        User host = ApiUsers.create(mockMvc);

        mockMvc.perform(post("/api/rooms").session(host.session()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"도둑잡기\", \"gameType\": \"OLD_MAID\", \"maxPlayers\": 7}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_CAPACITY"))
                .andExpect(jsonPath("$.message").value("이 게임에서 고를 수 없는 최대 인원이에요."));
        String code = create(host, 6);
        mockMvc.perform(post("/api/rooms/{code}/leave", code).session(host.session()));
    }

    @Test
    void 여섯_명이_모여_시작한다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        String code = create(host, 6);
        List<User> guests = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            User guest = ApiUsers.create(mockMvc);
            guests.add(guest);
            mockMvc.perform(post("/api/rooms/{code}/join", code).session(guest.session()));
            mockMvc.perform(post("/api/rooms/{code}/ready", code).session(guest.session())
                    .contentType(MediaType.APPLICATION_JSON).content("{\"ready\": true}"));
        }

        mockMvc.perform(post("/api/rooms/{code}/start", code).session(host.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PLAYING"))
                .andExpect(jsonPath("$.members.length()").value(6));

        for (User guest : guests) {
            mockMvc.perform(post("/api/rooms/{code}/leave", code).session(guest.session()));
        }
        mockMvc.perform(post("/api/rooms/{code}/leave", code).session(host.session()));
    }
}
