package com.boardgame.room.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.boardgame.room.application.RoomNotifier;
import com.boardgame.room.application.RoomService;
import com.boardgame.support.ApiUsers;
import com.boardgame.support.ApiUsers.User;
import com.jayway.jsonpath.JsonPath;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

@SpringBootTest
@AutoConfigureMockMvc
class RoomSpectatorApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RoomService roomService;

    @MockitoBean
    private RoomNotifier notifier;

    private final List<User> users = new ArrayList<>();

    // 같은 컨텍스트를 쓰는 다른 테스트에 남은 방이 영향을 주지 않도록 모두 나간다
    @AfterEach
    void leaveAllRooms() throws Exception {
        for (User user : users) {
            leaveCurrentRoom(user);
        }
    }

    private void leaveCurrentRoom(User user) throws Exception {
        String body = mockMvc.perform(get("/api/rooms/me").session(user.session()))
                .andReturn().getResponse().getContentAsString();
        if (body.isEmpty()) {
            return;
        }
        leave(user, JsonPath.read(body, "$.code"));
    }

    private User user() throws Exception {
        User user = ApiUsers.create(mockMvc);
        users.add(user);
        return user;
    }

    private String createRoom(User host, String body) throws Exception {
        String response = mockMvc.perform(post("/api/rooms").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(response, "$.code");
    }

    private ResultActions join(User user, String code, String body) throws Exception {
        return mockMvc.perform(post("/api/rooms/{code}/join", code).session(user.session())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private ResultActions start(User user, String code) throws Exception {
        return mockMvc.perform(post("/api/rooms/{code}/start", code).session(user.session()));
    }

    private ResultActions watch(User user, String code) throws Exception {
        return mockMvc.perform(post("/api/rooms/{code}/watch", code).session(user.session()));
    }

    private void ready(User guest, String code) throws Exception {
        mockMvc.perform(post("/api/rooms/{code}/ready", code).session(guest.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ready\": true}"))
                .andExpect(status().isOk());
    }

    private ResultActions leave(User user, String code) throws Exception {
        return mockMvc.perform(post("/api/rooms/{code}/leave", code).session(user.session()));
    }

    private ResultActions getRoom(User user, String code) throws Exception {
        return mockMvc.perform(get("/api/rooms/{code}", code).session(user.session()));
    }

    private String playingRoom(User host, User guest) throws Exception {
        String code = createRoom(host, """
                {"name": "관전 방", "gameType": "PAPER_SAFARI"}
                """);
        join(guest, code, "{}").andExpect(status().isOk());
        ready(guest, code);
        start(host, code).andExpect(status().isOk());
        return code;
    }

    @Test
    void 게임_중인_공개방을_관전하면_200이고_관전자_목록에_보인다() throws Exception {
        User host = user();
        User guest = user();
        User watcher = user();
        String code = playingRoom(host, guest);

        watch(watcher, code)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PLAYING"))
                .andExpect(jsonPath("$.members.length()").value(2))
                .andExpect(jsonPath("$.spectators.length()").value(1))
                .andExpect(jsonPath("$.spectators[0].id").value(watcher.id()))
                .andExpect(jsonPath("$.spectators[0].nickname").value(watcher.nickname()))
                .andExpect(jsonPath("$.spectators[0].avatar")
                        .value(com.boardgame.member.domain.Avatar.defaultFor(watcher.id()).key()));
        watch(watcher, code).andExpect(status().isOk())
                .andExpect(jsonPath("$.spectators.length()").value(1));
    }

    @Test
    void 잠긴_방은_403_ROOM_PRIVATE이고_대기_중인_방은_409_ROOM_NOT_PLAYING() throws Exception {
        User host = user();
        User guest = user();
        User watcher = user();
        String locked = createRoom(host, """
                {"name": "비밀 방", "gameType": "PAPER_SAFARI", "password": "1234"}
                """);
        join(guest, locked, """
                {"password": "1234"}
                """).andExpect(status().isOk());
        ready(guest, locked);
        start(host, locked).andExpect(status().isOk());

        watch(watcher, locked)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ROOM_PRIVATE"));

        User otherHost = user();
        String waiting = createRoom(otherHost, """
                {"name": "대기 방", "gameType": "PAPER_SAFARI"}
                """);
        watch(watcher, waiting)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ROOM_NOT_PLAYING"));
    }

    @Test
    void 관전자는_시작할_수_없지만_방_정보는_볼_수_있고_외부인은_볼_수_없다() throws Exception {
        User host = user();
        User guest = user();
        User watcher = user();
        User outsider = user();
        String code = playingRoom(host, guest);
        watch(watcher, code).andExpect(status().isOk());

        start(watcher, code)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_IN_ROOM"));
        getRoom(watcher, code)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.spectators[0].id").value(watcher.id()));
        getRoom(outsider, code)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_IN_ROOM"));
    }

    @Test
    void 관전_중에는_방을_만들_수_없고_내_방으로_보인다() throws Exception {
        User host = user();
        User guest = user();
        User watcher = user();
        String code = playingRoom(host, guest);
        watch(watcher, code).andExpect(status().isOk());

        mockMvc.perform(post("/api/rooms").session(watcher.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name": "새 방", "gameType": "PAPER_SAFARI"}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ALREADY_IN_ROOM"));
        mockMvc.perform(get("/api/rooms/me").session(watcher.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(code));
    }

    @Test
    void 관전자가_나가면_204이고_목록의_관전자_수가_줄어든다() throws Exception {
        User host = user();
        User guest = user();
        User watcher = user();
        String code = playingRoom(host, guest);
        watch(watcher, code).andExpect(status().isOk());
        mockMvc.perform(get("/api/rooms").session(host.session()))
                .andExpect(jsonPath("$[?(@.code == '%s')].spectatorCount".formatted(code)).value(1));

        leave(watcher, code).andExpect(status().isNoContent());

        mockMvc.perform(get("/api/rooms").session(host.session()))
                .andExpect(jsonPath("$[?(@.code == '%s')].spectatorCount".formatted(code)).value(0));
        mockMvc.perform(get("/api/rooms/me").session(watcher.session()))
                .andExpect(status().isNoContent());
        getRoom(host, code)
                .andExpect(jsonPath("$.status").value("PLAYING"))
                .andExpect(jsonPath("$.members.length()").value(2));
    }

    @Test
    void 관전자가_아니면_자리에_앉을_수_없고_게임_중에도_앉을_수_없다() throws Exception {
        User host = user();
        User guest = user();
        User watcher = user();
        String code = playingRoom(host, guest);
        watch(watcher, code).andExpect(status().isOk());

        mockMvc.perform(post("/api/rooms/{code}/seat", code).session(watcher.session()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ROOM_ALREADY_PLAYING"));
        mockMvc.perform(post("/api/rooms/{code}/seat", code).session(guest.session()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("NOT_SPECTATOR"));
    }

    @Test
    void 게임이_끝나면_관전자가_자동으로_참가한다() throws Exception {
        User host = user();
        User guest = user();
        User third = user();
        User watcher = user();
        String code = createRoom(host, """
                {"name": "관전 방", "gameType": "PAPER_SAFARI"}
                """);
        join(guest, code, "{}").andExpect(status().isOk());
        join(third, code, "{}").andExpect(status().isOk());
        ready(guest, code);
        ready(third, code);
        start(host, code).andExpect(status().isOk());
        watch(watcher, code).andExpect(status().isOk());
        leave(third, code).andExpect(status().isNoContent());
        leave(guest, code).andExpect(status().isNoContent());

        getRoom(host, code)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("WAITING"))
                .andExpect(jsonPath("$.members.length()").value(2))
                .andExpect(jsonPath("$.members[0].ready").value(false))
                .andExpect(jsonPath("$.members[1].id").value(watcher.id()))
                .andExpect(jsonPath("$.spectators.length()").value(0));
    }

    @Test
    void 관전자의_연결_상태_변화는_방에_알리지_않는다() throws Exception {
        User host = user();
        User guest = user();
        User watcher = user();
        String code = playingRoom(host, guest);
        watch(watcher, code).andExpect(status().isOk());
        clearInvocations(notifier);

        roomService.presenceChanged(watcher.id());

        verify(notifier, never()).roomUpdated(any());
    }
}
