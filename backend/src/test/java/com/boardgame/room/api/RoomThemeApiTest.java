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
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

@SpringBootTest
@AutoConfigureMockMvc
class RoomThemeApiTest {

    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private RoomNotifier notifier;

    private ResultActions create(User host, String extra) throws Exception {
        return mockMvc.perform(post("/api/rooms").session(host.session())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"테마방\",\"gameType\":\"PAPER_SAFARI\"" + extra + "}"));
    }

    private void leave(User host, String code) throws Exception {
        mockMvc.perform(post("/api/rooms/{code}/leave", code).session(host.session()));
    }

    @ParameterizedTest
    @ValueSource(strings = {"WOOD", "SUNSET", "MOONLIT", "AURORA", "BEACH"})
    void 고른_테마가_방_응답과_목록에_담긴다(String theme) throws Exception {
        User host = ApiUsers.create(mockMvc);
        String body = create(host, ",\"theme\":\"" + theme + "\"").andExpect(status().isCreated())
                .andExpect(jsonPath("$.theme").value(theme)).andReturn().getResponse().getContentAsString();
        String code = JsonPath.read(body, "$.code");

        mockMvc.perform(get("/api/rooms/{code}", code).session(host.session()))
                .andExpect(jsonPath("$.theme").value(theme));
        mockMvc.perform(get("/api/rooms").session(host.session()))
                .andExpect(jsonPath("$[?(@.code == '%s')].theme".formatted(code)).value(theme));
        leave(host, code);
    }

    @Test
    void 테마를_생략하면_WOOD다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        String body = create(host, "").andExpect(status().isCreated())
                .andExpect(jsonPath("$.theme").value("WOOD")).andReturn().getResponse().getContentAsString();
        leave(host, JsonPath.read(body, "$.code"));
    }

    @Test
    void 모르는_테마는_400이다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        create(host, ",\"theme\":\"BLOSSOM\"").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_THEME"))
                .andExpect(jsonPath("$.message").value("지원하지 않는 테마예요."));
    }
}
