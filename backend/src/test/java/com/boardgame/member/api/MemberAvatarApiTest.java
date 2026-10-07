package com.boardgame.member.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.boardgame.member.domain.Avatar;
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
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class MemberAvatarApiTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RoomNotifier notifier;

    private ResultActions change(User user, String body) throws Exception {
        return mockMvc.perform(patch("/api/members/me/avatar").session(user.session())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    @Test
    void 고르지_않았으면_회원_id로_정한_기본_그림을_돌려준다() throws Exception {
        User user = ApiUsers.create(mockMvc);

        mockMvc.perform(get("/api/members/me").session(user.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatar").value(Avatar.defaultFor(user.id()).key()));
    }

    @Test
    void 프로필_그림을_바꾸면_내_정보에_바로_보인다() throws Exception {
        User user = ApiUsers.create(mockMvc);

        change(user, "{\"avatar\": \"PENGUIN\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(user.id()))
                .andExpect(jsonPath("$.avatar").value("PENGUIN"));
        mockMvc.perform(get("/api/members/me").session(user.session()))
                .andExpect(jsonPath("$.avatar").value("PENGUIN"));
    }

    @Test
    void 없는_그림이나_빈_값은_통일된_400_INVALID_AVATAR() throws Exception {
        User user = ApiUsers.create(mockMvc);

        change(user, "{\"avatar\": \"DRAGON\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.code").value("INVALID_AVATAR"))
                .andExpect(jsonPath("$.message").value("고를 수 없는 프로필 사진이에요."));
        change(user, "{}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_AVATAR"));
    }

    @Test
    void 로그인하지_않으면_바꿀_수_없다() throws Exception {
        mockMvc.perform(patch("/api/members/me/avatar").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"avatar\": \"CAT\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void 방_정보에_참가자와_관전자의_그림이_실린다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        change(host, "{\"avatar\": \"FROG\"}").andExpect(status().isOk());
        String body = mockMvc.perform(post("/api/rooms").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"그림 방\", \"gameType\": \"PAPER_SAFARI\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.members[0].avatar").value("FROG"))
                .andReturn().getResponse().getContentAsString();
        String code = JsonPath.read(body, "$.code");

        mockMvc.perform(post("/api/rooms/{code}/join", code).session(guest.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.members[1].avatar").value(Avatar.defaultFor(guest.id()).key()));
        change(guest, "{\"avatar\": \"TIGER\"}").andExpect(status().isOk());
        mockMvc.perform(get("/api/rooms/{code}", code).session(guest.session()))
                .andExpect(jsonPath("$.members[1].avatar").value("TIGER"));
    }
}
