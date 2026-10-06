package com.boardgame.room.api;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.boardgame.room.application.RoomNotifier;
import com.boardgame.room.application.RoomService;
import com.boardgame.support.ApiUsers;
import com.boardgame.support.ApiUsers.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class RoomLogoutFailureApiTest {

    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private RoomNotifier notifier;
    @MockitoSpyBean
    private RoomService roomService;

    @Test
    void 방_정리가_실패해도_로그아웃은_끝나고_세션이_지워진다() throws Exception {
        User user = ApiUsers.create(mockMvc);
        doThrow(new RuntimeException("boom")).when(roomService).leaveCurrentRoom(anyLong());

        mockMvc.perform(post("/api/auth/logout").session(user.session())).andExpect(status().isNoContent());

        mockMvc.perform(get("/api/members/me").session(user.session())).andExpect(status().isUnauthorized());
    }
}
