package com.boardgame.friend.api;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.boardgame.friend.application.FriendNotifier;
import com.boardgame.friend.application.FriendSignal;
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

// 알림은 커밋된 뒤에만 나가므로, 테스트 트랜잭션으로 감싸지 않고 실제로 커밋되게 둔다(회원은 매번 새로 만든다).
@SpringBootTest
@AutoConfigureMockMvc
class FriendNotificationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FriendNotifier notifier;

    private void request(User from, User to) throws Exception {
        mockMvc.perform(post("/api/friends/requests").session(from.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"memberId\": %d}".formatted(to.id())))
                .andExpect(status().isCreated());
    }

    private long incomingRequestId(User user) throws Exception {
        String body = mockMvc.perform(get("/api/friends/requests").session(user.session()))
                .andReturn().getResponse().getContentAsString();
        Number id = JsonPath.read(body, "$.incoming[0].requestId");
        return id.longValue();
    }

    @Test
    void 요청을_받은_사람과_수락된_사람에게_상대_닉네임과_함께_알린다() throws Exception {
        User alice = ApiUsers.create(mockMvc);
        User bob = ApiUsers.create(mockMvc);

        request(alice, bob);
        verify(notifier).notify(bob.id(), FriendSignal.requestReceived(alice.nickname()));

        mockMvc.perform(post("/api/friends/requests/" + incomingRequestId(bob) + "/accept").session(bob.session()))
                .andExpect(status().isNoContent());
        verify(notifier).notify(alice.id(), FriendSignal.requestAccepted(bob.nickname()));

        mockMvc.perform(delete("/api/friends/" + bob.id()).session(alice.session()))
                .andExpect(status().isNoContent());
        verify(notifier).notify(bob.id(), FriendSignal.updated());
        verifyNoMoreInteractions(notifier);
    }

    @Test
    void 서로_요청해_바로_친구가_되면_먼저_요청한_사람에게_수락을_알린다() throws Exception {
        User alice = ApiUsers.create(mockMvc);
        User bob = ApiUsers.create(mockMvc);
        request(alice, bob);

        request(bob, alice);

        verify(notifier).notify(alice.id(), FriendSignal.requestAccepted(bob.nickname()));
    }

    @Test
    void 거절과_취소는_상대_화면만_조용히_새로_고친다() throws Exception {
        User alice = ApiUsers.create(mockMvc);
        User bob = ApiUsers.create(mockMvc);

        request(alice, bob);
        mockMvc.perform(post("/api/friends/requests/" + incomingRequestId(bob) + "/decline").session(bob.session()))
                .andExpect(status().isNoContent());
        verify(notifier).notify(alice.id(), FriendSignal.updated());

        request(alice, bob);
        mockMvc.perform(delete("/api/friends/requests/" + incomingRequestId(bob)).session(alice.session()))
                .andExpect(status().isNoContent());
        verify(notifier).notify(bob.id(), FriendSignal.updated());
    }

    @Test
    void 실패한_요청은_알리지_않는다() throws Exception {
        User alice = ApiUsers.create(mockMvc);

        mockMvc.perform(post("/api/friends/requests").session(alice.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"memberId\": %d}".formatted(alice.id())))
                .andExpect(status().isBadRequest());

        verifyNoMoreInteractions(notifier);
    }
}
