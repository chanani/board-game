package com.boardgame.friend.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.boardgame.friend.domain.FriendList;
import com.boardgame.friend.domain.Friendship;
import com.boardgame.friend.domain.FriendshipRepository;
import com.boardgame.room.application.PresenceTracker;
import com.boardgame.support.ApiUsers;
import com.boardgame.support.ApiUsers.User;
import com.jayway.jsonpath.JsonPath;
import java.time.Instant;
import java.util.stream.LongStream;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class FriendApiTest {

    // 실제 회원 번호와 겹치지 않는, 친구 수 제한을 채우는 데만 쓰는 번호
    private static final long FILLER_ID_BASE = 900_000L;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FriendshipRepository friendshipRepository;

    @Autowired
    private PresenceTracker presence;

    private ResultActions requestByNickname(User from, String nickname) throws Exception {
        return mockMvc.perform(post("/api/friends/requests").session(from.session())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nickname\": \"%s\"}".formatted(nickname)));
    }

    private ResultActions requestById(User from, long memberId) throws Exception {
        return mockMvc.perform(post("/api/friends/requests").session(from.session())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"memberId\": %d}".formatted(memberId)));
    }

    private ResultActions friendsOf(User user) throws Exception {
        return mockMvc.perform(get("/api/friends").session(user.session())).andExpect(status().isOk());
    }

    private ResultActions requestsOf(User user) throws Exception {
        return mockMvc.perform(get("/api/friends/requests").session(user.session())).andExpect(status().isOk());
    }

    private long incomingRequestId(User user) throws Exception {
        String body = requestsOf(user).andReturn().getResponse().getContentAsString();
        Number id = JsonPath.read(body, "$.incoming[0].requestId");
        return id.longValue();
    }

    private ResultActions accept(User user, long requestId) throws Exception {
        return mockMvc.perform(post("/api/friends/requests/" + requestId + "/accept").session(user.session()));
    }

    private ResultActions decline(User user, long requestId) throws Exception {
        return mockMvc.perform(post("/api/friends/requests/" + requestId + "/decline").session(user.session()));
    }

    private ResultActions cancel(User user, long requestId) throws Exception {
        return mockMvc.perform(delete("/api/friends/requests/" + requestId).session(user.session()));
    }

    private ResultActions remove(User user, long friendId) throws Exception {
        return mockMvc.perform(delete("/api/friends/" + friendId).session(user.session()));
    }

    private void befriend(User alice, User bob) throws Exception {
        requestById(alice, bob.id()).andExpect(status().isCreated());
        accept(bob, incomingRequestId(bob)).andExpect(status().isNoContent());
    }

    private void fillFriends(User user) {
        LongStream.range(0, FriendList.MAX_FRIENDS)
                .forEach(index -> friendshipRepository.save(Friendship.between(user.id(), FILLER_ID_BASE + index)));
        friendshipRepository.flush();
    }

    @Test
    void 닉네임으로_요청하면_상대의_받은_요청과_내_보낸_요청에_보인다() throws Exception {
        User alice = ApiUsers.create(mockMvc);
        User bob = ApiUsers.create(mockMvc);

        requestByNickname(alice, " " + bob.nickname() + " ")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("REQUESTED"))
                .andExpect(jsonPath("$.memberId").value(bob.id()))
                .andExpect(jsonPath("$.nickname").value(bob.nickname()));

        requestsOf(bob)
                .andExpect(jsonPath("$.incoming.length()").value(1))
                .andExpect(jsonPath("$.incoming[0].memberId").value(alice.id()))
                .andExpect(jsonPath("$.incoming[0].nickname").value(alice.nickname()))
                .andExpect(jsonPath("$.incoming[0].avatar").isNotEmpty())
                .andExpect(jsonPath("$.outgoing.length()").value(0));
        requestsOf(alice)
                .andExpect(jsonPath("$.incoming.length()").value(0))
                .andExpect(jsonPath("$.outgoing[0].memberId").value(bob.id()))
                .andExpect(jsonPath("$.outgoing[0].nickname").value(bob.nickname()));
        friendsOf(alice).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void 회원_번호로도_요청할_수_있다() throws Exception {
        User alice = ApiUsers.create(mockMvc);
        User bob = ApiUsers.create(mockMvc);

        requestById(alice, bob.id())
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("REQUESTED"));

        requestsOf(bob).andExpect(jsonPath("$.incoming[0].memberId").value(alice.id()));
    }

    @Test
    void 수락하면_서로의_친구_목록에_보이고_요청은_사라진다() throws Exception {
        User alice = ApiUsers.create(mockMvc);
        User bob = ApiUsers.create(mockMvc);
        requestById(alice, bob.id());
        long requestId = incomingRequestId(bob);

        accept(bob, requestId).andExpect(status().isNoContent());

        friendsOf(alice)
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].memberId").value(bob.id()))
                .andExpect(jsonPath("$[0].nickname").value(bob.nickname()))
                .andExpect(jsonPath("$[0].avatar").isNotEmpty())
                .andExpect(jsonPath("$[0].online").value(false));
        friendsOf(bob).andExpect(jsonPath("$[0].memberId").value(alice.id()));
        requestsOf(bob).andExpect(jsonPath("$.incoming.length()").value(0));
        requestsOf(alice).andExpect(jsonPath("$.outgoing.length()").value(0));
        accept(bob, requestId)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("FRIEND_REQUEST_NOT_FOUND"));
    }

    @Test
    void 서로_요청하면_두_번째_요청에서_바로_친구가_된다() throws Exception {
        User alice = ApiUsers.create(mockMvc);
        User bob = ApiUsers.create(mockMvc);
        requestById(alice, bob.id());

        requestByNickname(bob, alice.nickname())
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("ACCEPTED"))
                .andExpect(jsonPath("$.memberId").value(alice.id()));

        friendsOf(alice).andExpect(jsonPath("$[0].memberId").value(bob.id()));
        friendsOf(bob).andExpect(jsonPath("$[0].memberId").value(alice.id()));
        requestsOf(alice).andExpect(jsonPath("$.outgoing.length()").value(0));
        requestsOf(bob).andExpect(jsonPath("$.incoming.length()").value(0));
    }

    @Test
    void 거절하면_요청이_사라지고_다시_요청할_수_있다() throws Exception {
        User alice = ApiUsers.create(mockMvc);
        User bob = ApiUsers.create(mockMvc);
        requestById(alice, bob.id());

        decline(bob, incomingRequestId(bob)).andExpect(status().isNoContent());

        requestsOf(bob).andExpect(jsonPath("$.incoming.length()").value(0));
        requestsOf(alice).andExpect(jsonPath("$.outgoing.length()").value(0));
        friendsOf(alice).andExpect(jsonPath("$.length()").value(0));
        requestById(alice, bob.id())
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("REQUESTED"));
    }

    @Test
    void 보낸_사람은_요청을_취소할_수_있다() throws Exception {
        User alice = ApiUsers.create(mockMvc);
        User bob = ApiUsers.create(mockMvc);
        requestById(alice, bob.id());
        long requestId = incomingRequestId(bob);

        cancel(alice, requestId).andExpect(status().isNoContent());

        requestsOf(bob).andExpect(jsonPath("$.incoming.length()").value(0));
        requestsOf(alice).andExpect(jsonPath("$.outgoing.length()").value(0));
    }

    @Test
    void 남의_요청은_수락_거절_취소할_수_없고_받은_사람은_취소를_보낸_사람은_수락을_할_수_없다() throws Exception {
        User alice = ApiUsers.create(mockMvc);
        User bob = ApiUsers.create(mockMvc);
        User carol = ApiUsers.create(mockMvc);
        requestById(alice, bob.id());
        long requestId = incomingRequestId(bob);

        accept(carol, requestId).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.code").value("FRIEND_REQUEST_NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("친구 요청을 찾을 수 없어요."));
        decline(carol, requestId).andExpect(jsonPath("$.code").value("FRIEND_REQUEST_NOT_FOUND"));
        cancel(carol, requestId).andExpect(jsonPath("$.code").value("FRIEND_REQUEST_NOT_FOUND"));
        accept(alice, requestId).andExpect(jsonPath("$.code").value("FRIEND_REQUEST_NOT_FOUND"));
        decline(alice, requestId).andExpect(jsonPath("$.code").value("FRIEND_REQUEST_NOT_FOUND"));
        cancel(bob, requestId).andExpect(jsonPath("$.code").value("FRIEND_REQUEST_NOT_FOUND"));
        requestsOf(bob).andExpect(jsonPath("$.incoming.length()").value(1));
    }

    @Test
    void 친구를_삭제하면_양쪽_목록에서_사라지고_다시_요청할_수_있다() throws Exception {
        User alice = ApiUsers.create(mockMvc);
        User bob = ApiUsers.create(mockMvc);
        befriend(alice, bob);

        remove(alice, bob.id()).andExpect(status().isNoContent());

        friendsOf(alice).andExpect(jsonPath("$.length()").value(0));
        friendsOf(bob).andExpect(jsonPath("$.length()").value(0));
        remove(bob, alice.id())
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("FRIEND_NOT_FOUND"));
        requestById(bob, alice.id()).andExpect(jsonPath("$.status").value("REQUESTED"));
    }

    @Test
    void 이미_보낸_요청이나_이미_친구인_사람에게는_다시_요청할_수_없다() throws Exception {
        User alice = ApiUsers.create(mockMvc);
        User bob = ApiUsers.create(mockMvc);
        requestById(alice, bob.id());

        requestByNickname(alice, bob.nickname())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("FRIEND_REQUEST_ALREADY_SENT"));
        requestsOf(bob).andExpect(jsonPath("$.incoming.length()").value(1));

        accept(bob, incomingRequestId(bob));
        requestById(alice, bob.id())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ALREADY_FRIENDS"));
        requestById(bob, alice.id())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ALREADY_FRIENDS"));
        friendsOf(alice).andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void 나에게는_요청할_수_없고_없는_회원은_찾을_수_없다() throws Exception {
        User alice = ApiUsers.create(mockMvc);

        requestByNickname(alice, alice.nickname())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("CANNOT_FRIEND_SELF"));
        requestById(alice, alice.id())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("CANNOT_FRIEND_SELF"));
        requestByNickname(alice, "없는사람")
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("MEMBER_NOT_FOUND"));
        requestById(alice, FILLER_ID_BASE)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("MEMBER_NOT_FOUND"));
        mockMvc.perform(post("/api/friends/requests").session(alice.session())
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("MEMBER_NOT_FOUND"));
        remove(alice, alice.id())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("CANNOT_FRIEND_SELF"));
    }

    @Test
    void 친구가_100명이면_더_요청할_수_없다() throws Exception {
        User alice = ApiUsers.create(mockMvc);
        User bob = ApiUsers.create(mockMvc);
        fillFriends(alice);

        requestById(alice, bob.id())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("FRIEND_LIMIT_REACHED"));
        requestsOf(bob).andExpect(jsonPath("$.incoming.length()").value(0));
    }

    @Test
    void 어느_한쪽이라도_친구가_100명이면_수락할_수_없고_요청은_남는다() throws Exception {
        User alice = ApiUsers.create(mockMvc);
        User bob = ApiUsers.create(mockMvc);
        User carol = ApiUsers.create(mockMvc);
        requestById(alice, bob.id());
        requestById(carol, alice.id());
        fillFriends(alice);

        accept(bob, incomingRequestId(bob))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("FRIEND_LIMIT_REACHED"));
        accept(alice, incomingRequestId(alice))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("FRIEND_LIMIT_REACHED"));

        requestsOf(bob).andExpect(jsonPath("$.incoming.length()").value(1));
        friendsOf(bob).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void 접속_중인_친구는_online으로_보이고_목록_위에_온다() throws Exception {
        User alice = ApiUsers.create(mockMvc);
        User bob = ApiUsers.create(mockMvc);
        User carol = ApiUsers.create(mockMvc);
        befriend(alice, bob);
        befriend(alice, carol);
        friendsOf(alice)
                .andExpect(jsonPath("$[0].online").value(false))
                .andExpect(jsonPath("$[1].online").value(false));

        presence.connected(carol.id(), "tab-1");
        presence.connected(carol.id(), "tab-2");
        friendsOf(alice)
                .andExpect(jsonPath("$[0].memberId").value(carol.id()))
                .andExpect(jsonPath("$[0].online").value(true))
                .andExpect(jsonPath("$[1].memberId").value(bob.id()))
                .andExpect(jsonPath("$[1].online").value(false));

        // 탭 하나를 닫아도 다른 탭이 열려 있으면 접속 중이다
        presence.disconnected(carol.id(), "tab-1", Instant.now());
        friendsOf(alice).andExpect(jsonPath("$[0].online").value(true));

        presence.disconnected(carol.id(), "tab-2", Instant.now());
        friendsOf(alice)
                .andExpect(jsonPath("$[0].online").value(false))
                .andExpect(jsonPath("$[1].online").value(false));
    }

    @Test
    void 로그인하지_않으면_쓸_수_없다() throws Exception {
        mockMvc.perform(get("/api/friends"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        mockMvc.perform(get("/api/friends/requests")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/friends/requests").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nickname\": \"누구\"}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/friends/requests/1/accept")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/friends/requests/1/decline")).andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/friends/requests/1")).andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/friends/1")).andExpect(status().isUnauthorized());
    }
}
