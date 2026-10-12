package com.boardgame.invite.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.boardgame.game.GameType;
import com.boardgame.invite.application.InviteNotifier;
import com.boardgame.invite.application.InviteSignal;
import com.boardgame.invite.application.InviteSignalType;
import com.boardgame.room.application.PresenceTracker;
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

// 친구 관계는 실제로 커밋되게 두고(회원은 매번 새로 만든다), 초대 알림만 가짜로 받아 확인한다.
@SpringBootTest
@AutoConfigureMockMvc
class RoomInviteApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PresenceTracker presence;

    @MockitoBean
    private InviteNotifier notifier;

    private User onlineUser() throws Exception {
        User user = ApiUsers.create(mockMvc);
        presence.connected(user.id(), "tab-" + user.id());
        return user;
    }

    private void befriend(User alice, User bob) throws Exception {
        mockMvc.perform(post("/api/friends/requests").session(alice.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"memberId\": %d}".formatted(bob.id())))
                .andExpect(status().isCreated());
        String body = mockMvc.perform(get("/api/friends/requests").session(bob.session()))
                .andReturn().getResponse().getContentAsString();
        Number requestId = JsonPath.read(body, "$.incoming[0].requestId");
        mockMvc.perform(post("/api/friends/requests/" + requestId + "/accept").session(bob.session()))
                .andExpect(status().isNoContent());
    }

    private User onlineFriendOf(User user) throws Exception {
        User friend = onlineUser();
        befriend(user, friend);
        return friend;
    }

    private String createRoom(User host, String extraJson) throws Exception {
        String body = mockMvc.perform(post("/api/rooms").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"모여라\",\"gameType\":\"PAPER_SAFARI\"" + extraJson + "}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.code");
    }

    private String createRoom(User host) throws Exception {
        return createRoom(host, "");
    }

    private ResultActions join(User user, String code) throws Exception {
        return mockMvc.perform(post("/api/rooms/{code}/join", code).session(user.session()));
    }

    private ResultActions leave(User user, String code) throws Exception {
        return mockMvc.perform(post("/api/rooms/{code}/leave", code).session(user.session()));
    }

    private ResultActions invite(User inviter, String code, long friendId) throws Exception {
        return mockMvc.perform(post("/api/rooms/{code}/invites", code).session(inviter.session())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"friendId\": %d}".formatted(friendId)));
    }

    private ResultActions accept(User invitee, String code, String inviteId) throws Exception {
        return mockMvc.perform(post("/api/rooms/{code}/invites/{inviteId}/accept", code, inviteId)
                .session(invitee.session()));
    }

    private ResultActions decline(User invitee, String code, String inviteId) throws Exception {
        return mockMvc.perform(post("/api/rooms/{code}/invites/{inviteId}/decline", code, inviteId)
                .session(invitee.session()));
    }

    private InviteSignal signalTo(User receiver) {
        ArgumentCaptor<InviteSignal> captor = ArgumentCaptor.forClass(InviteSignal.class);
        verify(notifier).notify(eq(receiver.id()), captor.capture());
        return captor.getValue();
    }

    private String invited(User inviter, String code, User friend) throws Exception {
        invite(inviter, code, friend.id()).andExpect(status().isCreated());
        return signalTo(friend).inviteId();
    }

    @Test
    void 초대하면_친구에게_방_이름과_게임을_담아_바로_알린다() throws Exception {
        User alice = onlineUser();
        User bob = onlineFriendOf(alice);
        String code = createRoom(alice);

        invite(alice, code, bob.id())
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.cooldownSeconds").value(10));

        InviteSignal signal = signalTo(bob);
        assertThat(signal.type()).isEqualTo(InviteSignalType.INVITED);
        assertThat(signal.inviteId()).isNotBlank();
        assertThat(signal.memberId()).isEqualTo(alice.id());
        assertThat(signal.nickname()).isEqualTo(alice.nickname());
        assertThat(signal.roomCode()).isEqualTo(code);
        assertThat(signal.roomName()).isEqualTo("모여라");
        assertThat(signal.gameType()).isEqualTo(GameType.PAPER_SAFARI);
        assertThat(signal.gameTypeName()).isEqualTo(GameType.PAPER_SAFARI.displayName());
        assertThat(signal.expiresInSeconds()).isEqualTo(30L);
    }

    @Test
    void 방장이_아닌_참가자도_초대할_수_있다() throws Exception {
        User alice = onlineUser();
        User bob = onlineUser();
        User carol = onlineFriendOf(bob);
        String code = createRoom(alice);
        join(bob, code).andExpect(status().isOk());

        invite(bob, code, carol.id()).andExpect(status().isCreated());

        assertThat(signalTo(carol).nickname()).isEqualTo(bob.nickname());
    }

    @Test
    void 방에_없는_사람은_초대할_수_없다() throws Exception {
        User alice = onlineUser();
        User bob = onlineUser();
        User carol = onlineFriendOf(bob);
        String code = createRoom(alice);

        invite(bob, code, carol.id())
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_IN_ROOM"));
        verifyNoInteractions(notifier);
    }

    @Test
    void 없는_방으로는_초대할_수_없다() throws Exception {
        User alice = onlineUser();
        User bob = onlineFriendOf(alice);

        invite(alice, "NOROOM", bob.id())
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("ROOM_NOT_FOUND"));
    }

    @Test
    void 친구가_아니면_초대할_수_없다() throws Exception {
        User alice = onlineUser();
        User stranger = onlineUser();
        String code = createRoom(alice);

        invite(alice, code, stranger.id())
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.code").value("INVITE_NOT_FRIEND"))
                .andExpect(jsonPath("$.message").value("친구만 초대할 수 있어요."));
        verifyNoInteractions(notifier);
    }

    @Test
    void 나를_초대하거나_친구를_고르지_않으면_잘못된_입력이다() throws Exception {
        User alice = onlineUser();
        String code = createRoom(alice);

        invite(alice, code, alice.id())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        mockMvc.perform(post("/api/rooms/{code}/invites", code).session(alice.session())
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        mockMvc.perform(post("/api/rooms/{code}/invites", code).session(alice.session()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void 접속해_있지_않은_친구는_초대할_수_없다() throws Exception {
        User alice = onlineUser();
        User bob = ApiUsers.create(mockMvc);
        befriend(alice, bob);
        String code = createRoom(alice);

        invite(alice, code, bob.id())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INVITE_FRIEND_OFFLINE"));
        verifyNoInteractions(notifier);
    }

    @Test
    void 이미_방에_있는_친구는_초대할_수_없다() throws Exception {
        User alice = onlineUser();
        User bob = onlineFriendOf(alice);
        String code = createRoom(alice);
        join(bob, code).andExpect(status().isOk());

        invite(alice, code, bob.id())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INVITE_ALREADY_IN_ROOM"));
    }

    @Test
    void 자리가_없는_방으로는_초대할_수_없다() throws Exception {
        User alice = onlineUser();
        User bob = onlineUser();
        User carol = onlineFriendOf(alice);
        String code = createRoom(alice, ",\"maxPlayers\":2");
        join(bob, code).andExpect(status().isOk());

        invite(alice, code, carol.id())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ROOM_FULL"));
    }

    @Test
    void 게임이_시작된_방으로는_초대할_수_없다() throws Exception {
        User alice = onlineUser();
        User bob = onlineUser();
        User carol = onlineFriendOf(alice);
        String code = createRoom(alice);
        String inviteId = invited(alice, code, carol);
        join(bob, code).andExpect(status().isOk());
        mockMvc.perform(post("/api/rooms/{code}/ready", code).session(bob.session())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"ready\": true}"))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/rooms/{code}/start", code).session(alice.session()))
                .andExpect(status().isOk());

        invite(alice, code, carol.id())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ROOM_ALREADY_PLAYING"));
        accept(carol, code, inviteId)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ROOM_ALREADY_PLAYING"));
    }

    @Test
    void 같은_친구를_연달아_초대하면_잠시_막는다() throws Exception {
        User alice = onlineUser();
        User bob = onlineFriendOf(alice);
        String code = createRoom(alice);
        invite(alice, code, bob.id()).andExpect(status().isCreated());

        invite(alice, code, bob.id())
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.code").value("INVITE_TOO_FAST"));

        verify(notifier).notify(eq(bob.id()), any());
    }

    @Test
    void 초대를_받으면_비공개방에_비밀번호_없이_들어간다() throws Exception {
        User alice = onlineUser();
        User bob = onlineFriendOf(alice);
        String code = createRoom(alice, ",\"password\":\"1234\"");
        join(bob, code).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ROOM_PASSWORD_MISMATCH"));
        String inviteId = invited(alice, code, bob);

        accept(bob, code, inviteId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(code))
                .andExpect(jsonPath("$.locked").value(true))
                .andExpect(jsonPath("$.members.length()").value(2))
                .andExpect(jsonPath("$.members[1].id").value(bob.id()));

        mockMvc.perform(get("/api/rooms/me").session(bob.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(code));
    }

    @Test
    void 한_번_쓴_초대로는_다시_들어갈_수_없다() throws Exception {
        User alice = onlineUser();
        User bob = onlineFriendOf(alice);
        String code = createRoom(alice, ",\"password\":\"1234\"");
        String inviteId = invited(alice, code, bob);
        accept(bob, code, inviteId).andExpect(status().isOk());
        leave(bob, code).andExpect(status().isNoContent());

        accept(bob, code, inviteId)
                .andExpect(status().isGone())
                .andExpect(jsonPath("$.status").value(410))
                .andExpect(jsonPath("$.code").value("INVITE_EXPIRED"));
    }

    @Test
    void 남의_초대나_다른_방의_초대로는_들어갈_수_없다() throws Exception {
        User alice = onlineUser();
        User bob = onlineFriendOf(alice);
        User mallory = onlineUser();
        User dave = onlineUser();
        String code = createRoom(alice, ",\"password\":\"1234\"");
        String otherCode = createRoom(dave, ",\"password\":\"5678\"");
        String inviteId = invited(alice, code, bob);

        accept(mallory, code, inviteId)
                .andExpect(status().isGone())
                .andExpect(jsonPath("$.code").value("INVITE_EXPIRED"));
        accept(bob, otherCode, inviteId)
                .andExpect(status().isGone())
                .andExpect(jsonPath("$.code").value("INVITE_EXPIRED"));
        accept(bob, code, "no-such-invite")
                .andExpect(status().isGone())
                .andExpect(jsonPath("$.code").value("INVITE_EXPIRED"));
    }

    @Test
    void 다른_방에_있으면_먼저_나와야_초대로_들어갈_수_있다() throws Exception {
        User alice = onlineUser();
        User bob = onlineFriendOf(alice);
        String code = createRoom(alice);
        String bobRoom = createRoom(bob);
        String inviteId = invited(alice, code, bob);

        accept(bob, code, inviteId)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ALREADY_IN_ROOM"));

        leave(bob, bobRoom).andExpect(status().isNoContent());
        accept(bob, code, inviteId).andExpect(status().isOk());
    }

    @Test
    void 그사이_방이_가득_차면_초대로도_들어갈_수_없다() throws Exception {
        User alice = onlineUser();
        User bob = onlineFriendOf(alice);
        User carol = onlineUser();
        String code = createRoom(alice, ",\"maxPlayers\":2");
        String inviteId = invited(alice, code, bob);
        join(carol, code).andExpect(status().isOk());

        accept(bob, code, inviteId)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ROOM_FULL"));
    }

    @Test
    void 방이_사라졌으면_방을_찾을_수_없다고_알린다() throws Exception {
        User alice = onlineUser();
        User bob = onlineFriendOf(alice);
        String code = createRoom(alice);
        String inviteId = invited(alice, code, bob);
        leave(alice, code).andExpect(status().isNoContent());

        accept(bob, code, inviteId)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("ROOM_NOT_FOUND"));
    }

    @Test
    void 초대한_사람이_방을_떠났으면_초대도_끝난다() throws Exception {
        User alice = onlineUser();
        User bob = onlineUser();
        User carol = onlineFriendOf(bob);
        String code = createRoom(alice, ",\"password\":\"1234\"");
        mockMvc.perform(post("/api/rooms/{code}/join", code).session(bob.session())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"password\":\"1234\"}"))
                .andExpect(status().isOk());
        String inviteId = invited(bob, code, carol);
        leave(bob, code).andExpect(status().isNoContent());

        accept(carol, code, inviteId)
                .andExpect(status().isGone())
                .andExpect(jsonPath("$.code").value("INVITE_EXPIRED"));
    }

    @Test
    void 거절하면_초대한_사람에게_알리고_그_초대는_더_쓸_수_없다() throws Exception {
        User alice = onlineUser();
        User bob = onlineFriendOf(alice);
        String code = createRoom(alice);
        String inviteId = invited(alice, code, bob);

        decline(bob, code, inviteId).andExpect(status().isNoContent());

        verify(notifier).notify(alice.id(), InviteSignal.declined(bob.id(), bob.nickname()));
        accept(bob, code, inviteId).andExpect(status().isGone());
    }

    @Test
    void 없는_초대나_남의_초대를_거절하면_아무_일도_없다() throws Exception {
        User alice = onlineUser();
        User bob = onlineFriendOf(alice);
        User mallory = onlineUser();
        String code = createRoom(alice);
        String inviteId = invited(alice, code, bob);

        decline(mallory, code, inviteId).andExpect(status().isNoContent());
        decline(bob, code, "no-such-invite").andExpect(status().isNoContent());

        verify(notifier, never()).notify(eq(alice.id()), any());
        accept(bob, code, inviteId).andExpect(status().isOk());
    }

    @Test
    void 로그인하지_않으면_초대할_수_없다() throws Exception {
        mockMvc.perform(post("/api/rooms/{code}/invites", "ABCDEF")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"friendId\": 1}"))
                .andExpect(status().isUnauthorized());
    }
}
