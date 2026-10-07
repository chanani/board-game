package com.boardgame.record.api;

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
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class OldMaidRecordApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void R32_실제_방에서_기권으로_끝나도_등수가_라운드_점수로_남고_1등만_승리다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String created = mockMvc.perform(post("/api/rooms").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"도둑잡기 전적 방\", \"gameType\": \"OLD_MAID\"}"))
                .andReturn().getResponse().getContentAsString();
        String code = JsonPath.read(created, "$.code");
        mockMvc.perform(post("/api/rooms/{code}/join", code).session(guest.session()));
        mockMvc.perform(post("/api/rooms/{code}/ready", code).session(guest.session())
                .contentType(MediaType.APPLICATION_JSON).content("{\"ready\": true}"));
        mockMvc.perform(post("/api/rooms/{code}/start", code).session(host.session()));

        mockMvc.perform(post("/api/rooms/{code}/leave", code).session(guest.session()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/records/me").session(host.session()))
                .andExpect(jsonPath("$.stats[2].gameType").value("OLD_MAID"))
                .andExpect(jsonPath("$.stats[2].gameTypeName").value("도둑잡기"))
                .andExpect(jsonPath("$.stats[2].wins").value(1))
                .andExpect(jsonPath("$.stats[2].rounds").value(1))
                .andExpect(jsonPath("$.stats[2].averageRoundScore").value(1.0));
        mockMvc.perform(get("/api/records/me").session(guest.session()))
                .andExpect(jsonPath("$.stats[2].losses").value(1))
                .andExpect(jsonPath("$.stats[2].averageRoundScore").value(2.0));
        mockMvc.perform(get("/api/records/members/{id}/matches", guest.id()).param("gameType", "OLD_MAID")
                        .session(guest.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].gameType").value("OLD_MAID"))
                .andExpect(jsonPath("$[0].result").value("LOSE"))
                .andExpect(jsonPath("$[0].tokens").value(2))
                .andExpect(jsonPath("$[0].rounds[0].score").value(2));
        mockMvc.perform(post("/api/rooms/{code}/leave", code).session(host.session()));
    }
}
