package com.boardgame.support;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

public final class ApiUsers {

    public record User(long id, String nickname, MockHttpSession session) {
    }

    private ApiUsers() {
    }

    public static User create(MockMvc mockMvc) throws Exception {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        String loginId = "u" + suffix;
        String nickname = "n" + suffix.substring(0, 6);
        mockMvc.perform(post("/api/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"loginId": "%s", "nickname": "%s", "password": "password1"}
                                """.formatted(loginId, nickname)))
                .andExpect(status().isCreated());
        MvcResult login = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"loginId": "%s", "password": "password1"}
                                """.formatted(loginId)))
                .andExpect(status().isOk())
                .andReturn();
        Number id = JsonPath.read(login.getResponse().getContentAsString(), "$.id");
        return new User(id.longValue(), nickname, (MockHttpSession) login.getRequest().getSession(false));
    }
}
