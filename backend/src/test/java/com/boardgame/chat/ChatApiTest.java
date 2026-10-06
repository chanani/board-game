package com.boardgame.chat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.boardgame.chat.application.ChatService;
import com.boardgame.common.error.BusinessException;
import com.boardgame.room.application.RoomNotifier;
import com.boardgame.room.application.RoomService;
import com.boardgame.room.domain.RoomClosedEvent;
import com.boardgame.support.ApiUsers;
import com.boardgame.support.ApiUsers.User;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class ChatApiTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ChatService chatService;
    @Autowired
    private RoomService roomService;
    @Autowired
    private ApplicationEventPublisher events;
    @MockitoBean
    private RoomNotifier notifier;

    private String createRoom(User host) throws Exception {
        String body = mockMvc.perform(post("/api/rooms").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"채팅방\",\"gameType\":\"PAPER_SAFARI\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.code");
    }

    @Test
    void 참가자가_보낸_메시지를_기록에서_읽고_방_밖_사람은_403이다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User outsider = ApiUsers.create(mockMvc);
        String code = createRoom(host);

        chatService.send(code, host.id(), "  안녕하세요  ");

        mockMvc.perform(get("/api/rooms/" + code + "/chat").session(host.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].memberId").value(host.id()))
                .andExpect(jsonPath("$[0].nickname").value(host.nickname()))
                .andExpect(jsonPath("$[0].text").value("안녕하세요"))
                .andExpect(jsonPath("$[0].sentAt").exists())
                .andExpect(jsonPath("$[0].id").exists());
        mockMvc.perform(get("/api/rooms/" + code + "/chat").session(outsider.session()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_IN_ROOM"));
        roomService.leave(code, host.id());
    }

    @Test
    void 방_밖_사람은_보낼_수_없다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User outsider = ApiUsers.create(mockMvc);
        String code = createRoom(host);

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> chatService.send(code, outsider.id(), "hi"))
                .isInstanceOf(BusinessException.class);
        roomService.leave(code, host.id());
    }

    @Test
    void 방이_사라지면_채팅_기록도_사라진다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        String code = createRoom(host);
        chatService.send(code, host.id(), "남을까");
        assertThat(chatService.history(code, host.id())).hasSize(1);

        events.publishEvent(new RoomClosedEvent(code));

        assertThat(chatService.history(code, host.id())).isEmpty();
        roomService.leave(code, host.id());
    }

    @Test
    void 모두_나가_방이_닫히면_이벤트로_기록이_지워진다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        String code = createRoom(host);
        chatService.send(code, host.id(), "사라질 말");
        roomService.leave(code, host.id());

        User next = ApiUsers.create(mockMvc);
        String newCode = createRoom(next);

        assertThat(chatService.history(newCode, next.id())).isEmpty();
        roomService.leave(newCode, next.id());
    }
}
