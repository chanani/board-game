package com.boardgame.member.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.boardgame.member.domain.Avatar;
import com.boardgame.room.api.RoomResponse;
import com.boardgame.room.application.RoomNotifier;
import com.boardgame.support.ApiUsers;
import com.boardgame.support.ApiUsers.User;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

// 그림 변경 이벤트는 커밋 뒤에만 방에 반영되므로 테스트 트랜잭션(롤백) 없이 확인한다.
@SpringBootTest
@AutoConfigureMockMvc
class AvatarRoomBroadcastApiTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RoomNotifier notifier;

    private ResultActions change(User user, String avatar) throws Exception {
        return mockMvc.perform(patch("/api/members/me/avatar").session(user.session())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"avatar\": \"%s\"}".formatted(avatar)));
    }

    // 다른 테스트 컨텍스트가 같은 메모리 DB를 다시 만들면 회원 id가 겹쳐, 남아 있던 방에 든 것으로 보일 수 있다. 먼저 비운다.
    private void leaveAnyRoom(User user) throws Exception {
        String body = mockMvc.perform(get("/api/rooms/me").session(user.session()))
                .andReturn().getResponse().getContentAsString();
        if (body.isEmpty()) {
            return;
        }
        String code = JsonPath.read(body, "$.code");
        mockMvc.perform(post("/api/rooms/{code}/leave", code).session(user.session()));
    }

    @Test
    void 방_정보에_그림이_실리고_바꾸면_커밋_뒤_그_방에_새_그림으로_다시_알린다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        leaveAnyRoom(host);
        leaveAnyRoom(guest);
        change(host, "FROG").andExpect(status().isOk());
        String body = mockMvc.perform(post("/api/rooms").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"그림 방\", \"gameType\": \"PAPER_SAFARI\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.members[0].avatar").value("FROG"))
                .andReturn().getResponse().getContentAsString();
        String code = JsonPath.read(body, "$.code");
        mockMvc.perform(post("/api/rooms/{code}/join", code).session(guest.session()))
                .andExpect(jsonPath("$.members[1].avatar").value(Avatar.defaultFor(guest.id()).key()));
        clearInvocations(notifier);

        change(guest, "TIGER").andExpect(status().isOk());

        ArgumentCaptor<RoomResponse> sent = ArgumentCaptor.forClass(RoomResponse.class);
        verify(notifier, atLeastOnce()).roomUpdated(sent.capture());
        assertThat(sent.getValue().code()).isEqualTo(code);
        assertThat(sent.getValue().members()).extracting(member -> member.avatar()).containsExactly("FROG", "TIGER");
        mockMvc.perform(get("/api/rooms/{code}", code).session(guest.session()))
                .andExpect(jsonPath("$.members[1].avatar").value("TIGER"));
        mockMvc.perform(post("/api/rooms/{code}/leave", code).session(guest.session()));
        mockMvc.perform(post("/api/rooms/{code}/leave", code).session(host.session()));
    }
}
