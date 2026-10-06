package com.boardgame.room.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.startsWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.boardgame.game.GameType;
import com.boardgame.game.MatchEntry;
import com.boardgame.game.ResultType;
import com.boardgame.game.event.GameCompletedEvent;
import com.boardgame.game.event.GameStartedEvent;
import com.boardgame.room.application.RoomNotifier;
import com.boardgame.support.ApiUsers;
import com.boardgame.support.ApiUsers.User;
import com.jayway.jsonpath.JsonPath;
import java.util.List;
import java.util.Locale;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

@SpringBootTest
@AutoConfigureMockMvc
@RecordApplicationEvents
class RoomApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ApplicationEvents events;

    @MockitoBean
    private RoomNotifier notifier;

    private ResultActions createRoom(User host, String name) throws Exception {
        return mockMvc.perform(post("/api/rooms").session(host.session())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"name": "%s", "gameType": "PAPER_SAFARI"}
                        """.formatted(name)));
    }

    private String createdCode(User host) throws Exception {
        String body = createRoom(host, "즐거운 방").andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.code");
    }

    private ResultActions join(User user, String code) throws Exception {
        return mockMvc.perform(post("/api/rooms/{code}/join", code).session(user.session()));
    }

    private ResultActions start(User user, String code) throws Exception {
        return mockMvc.perform(post("/api/rooms/{code}/start", code).session(user.session()));
    }

    private ResultActions leave(User user, String code) throws Exception {
        return mockMvc.perform(post("/api/rooms/{code}/leave", code).session(user.session()));
    }

    @Test
    void 방을_만들면_201과_방_정보를_돌려준다() throws Exception {
        User host = ApiUsers.create(mockMvc);

        createRoom(host, " 즐거운 방 ")
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", startsWith("/api/rooms/")))
                .andExpect(jsonPath("$.code").value(org.hamcrest.Matchers.matchesPattern("^[A-Z0-9]{6}$")))
                .andExpect(jsonPath("$.name").value("즐거운 방"))
                .andExpect(jsonPath("$.gameType").value("PAPER_SAFARI"))
                .andExpect(jsonPath("$.gameTypeName").value("페이퍼 사파리"))
                .andExpect(jsonPath("$.status").value("WAITING"))
                .andExpect(jsonPath("$.hostId").value(host.id()))
                .andExpect(jsonPath("$.maxPlayers").value(5))
                .andExpect(jsonPath("$.members[0].nickname").value(host.nickname()))
                .andExpect(jsonPath("$.members[0].host").value(true));
    }

    @Test
    void 방_이름이_잘못되면_INVALID_ROOM_NAME() throws Exception {
        User host = ApiUsers.create(mockMvc);

        createRoom(host, "   ")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_ROOM_NAME"));
    }

    @Test
    void 대기_중인_방_목록에_보이고_소문자_코드로도_참가한다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String code = createdCode(host);

        mockMvc.perform(get("/api/rooms").param("gameType", "PAPER_SAFARI").session(guest.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.code == '%s')].playerCount".formatted(code)).value(1))
                .andExpect(jsonPath("$[?(@.code == '%s')].hostNickname".formatted(code)).value(host.nickname()));

        join(guest, code.toLowerCase(Locale.ROOT))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.members.length()").value(2));
        verify(notifier, atLeastOnce()).roomUpdated(argThat(room ->
                room.code().equals(code) && room.members().size() == 2));
    }

    @Test
    void 이미_방에_있으면_새_방을_만들거나_다른_방에_들어갈_수_없다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User other = ApiUsers.create(mockMvc);
        createdCode(host);
        String otherCode = createdCode(other);

        createRoom(host, "두 번째").andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ALREADY_IN_ROOM"));
        join(host, otherCode).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ALREADY_IN_ROOM"));
    }

    @Test
    void 없는_방은_ROOM_NOT_FOUND() throws Exception {
        User user = ApiUsers.create(mockMvc);

        join(user, "ZZZZZZ").andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("ROOM_NOT_FOUND"));
        mockMvc.perform(get("/api/rooms/{code}", "bad").session(user.session()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("ROOM_NOT_FOUND"));
    }

    @Test
    void 방장이_아니면_시작할_수_없고_혼자서는_시작할_수_없다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String code = createdCode(host);

        start(host, code).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("NOT_ENOUGH_PLAYERS"));
        join(guest, code);
        start(guest, code).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_ROOM_HOST"));
    }

    @Test
    void 시작하면_진행_중이_되고_시작_이벤트와_각자의_화면이_전송된다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String code = createdCode(host);
        join(guest, code);

        start(host, code).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PLAYING"));

        assertThat(events.stream(GameStartedEvent.class))
                .filteredOn(event -> event.memberIds().contains(host.id()))
                .singleElement()
                .satisfies(event -> {
                    assertThat(event.gameType()).isEqualTo(GameType.PAPER_SAFARI);
                    assertThat(event.memberIds()).containsExactly(host.id(), guest.id());
                    assertThat(event.matchKey()).isNotBlank();
                });
        verify(notifier).gameUpdated(eq(host.id()), any());
        verify(notifier).gameUpdated(eq(guest.id()), any());
    }

    @Test
    void 진행_중인_방에는_새로_참가할_수_없다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        User late = ApiUsers.create(mockMvc);
        String code = createdCode(host);
        join(guest, code);
        start(host, code);

        join(late, code).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ROOM_ALREADY_PLAYING"));
    }

    @Test
    void 게임_중_나가면_기권으로_게임이_끝나고_방은_대기_상태로_돌아간다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String code = createdCode(host);
        join(guest, code);
        start(host, code);

        leave(host, code).andExpect(status().isNoContent());

        assertThat(events.stream(GameCompletedEvent.class))
                .filteredOn(event -> event.result().entries().stream().anyMatch(entry -> entry.memberId() == host.id()))
                .singleElement()
                .satisfies(event -> assertThat(event.result().entries()).containsExactly(
                        new MatchEntry(host.id(), ResultType.LOSE, 0, 0),
                        new MatchEntry(guest.id(), ResultType.WIN, 0, 1)));
        mockMvc.perform(get("/api/rooms/{code}", code).session(guest.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("WAITING"))
                .andExpect(jsonPath("$.hostId").value(guest.id()))
                .andExpect(jsonPath("$.members.length()").value(1));
    }

    @Test
    void 한_게임의_시작과_종료_이벤트는_같은_매치_키이고_재대결은_새_키다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        User third = ApiUsers.create(mockMvc);
        String code = createdCode(host);
        join(guest, code);
        start(host, code);
        leave(guest, code).andExpect(status().isNoContent());

        join(third, code);
        start(host, code);

        String firstStartKey = events.stream(GameStartedEvent.class)
                .filter(event -> event.memberIds().contains(host.id()) && event.memberIds().contains(guest.id()))
                .findFirst().orElseThrow().matchKey();
        String completedKey = events.stream(GameCompletedEvent.class)
                .filter(event -> event.result().entries().stream().anyMatch(entry -> entry.memberId() == host.id()))
                .findFirst().orElseThrow().matchKey();
        String rematchKey = events.stream(GameStartedEvent.class)
                .filter(event -> event.memberIds().contains(third.id()))
                .findFirst().orElseThrow().matchKey();
        assertThat(completedKey).isEqualTo(firstStartKey);
        assertThat(rematchKey).isNotEqualTo(firstStartKey);
    }

    @Test
    void 내_방을_조회하고_마지막_사람이_나가면_방이_사라진다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        String code = createdCode(host);

        mockMvc.perform(get("/api/rooms/me").session(host.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(code));

        leave(host, code).andExpect(status().isNoContent());

        mockMvc.perform(get("/api/rooms/me").session(host.session()))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/rooms/{code}", code).session(host.session()))
                .andExpect(status().isNotFound());
    }

    @Test
    void 로그인하지_않으면_방_API와_WebSocket은_401() throws Exception {
        mockMvc.perform(get("/api/rooms"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        mockMvc.perform(get("/ws"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void 게임_종류가_없으면_INVALID_INPUT() throws Exception {
        User host = ApiUsers.create(mockMvc);

        mockMvc.perform(post("/api/rooms").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"방\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        mockMvc.perform(post("/api/rooms").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"방\", \"gameType\": \"CHESS\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    private ResultActions createWith(User host, String extraJson) throws Exception {
        return mockMvc.perform(post("/api/rooms").session(host.session())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"비밀방\",\"gameType\":\"PAPER_SAFARI\"," + extraJson + "}"));
    }

    private ResultActions joinWith(User user, String code, String body) throws Exception {
        return mockMvc.perform(post("/api/rooms/{code}/join", code).session(user.session())
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private String createdWith(User host, String extraJson) throws Exception {
        String body = createWith(host, extraJson).andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.code");
    }

    @Test
    void 비밀번호와_정원을_정해_만들면_해시나_원문이_응답에_없다() throws Exception {
        User host = ApiUsers.create(mockMvc);

        String body = createWith(host, "\"maxPlayers\":3,\"password\":\"1234\"")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.maxPlayers").value(3))
                .andExpect(jsonPath("$.locked").value(true))
                .andReturn().getResponse().getContentAsString();

        assertThat(body).doesNotContain("1234").doesNotContain("$2a$");
    }

    @Test
    void 범위를_벗어난_정원과_짧은_비밀번호는_400() throws Exception {
        User host = ApiUsers.create(mockMvc);

        createWith(host, "\"maxPlayers\":6").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_CAPACITY"));
        createWith(host, "\"password\":\"12\"").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_ROOM_PASSWORD"));
    }

    @Test
    void 잠긴_방은_맞는_비밀번호로만_들어가고_멤버는_다시_들어갈_수_있다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String code = createdWith(host, "\"password\":\"1234\"");

        join(guest, code).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ROOM_PASSWORD_MISMATCH"));
        joinWith(guest, code, "{\"password\":\"0000\"}").andExpect(status().isForbidden());
        joinWith(guest, code, "{\"password\":\"1234\"}").andExpect(status().isOk());
        join(guest, code).andExpect(status().isOk());
    }

    @Test
    void 정원이_찬_방은_409() throws Exception {
        User host = ApiUsers.create(mockMvc);
        String code = createdWith(host, "\"maxPlayers\":2");
        join(ApiUsers.create(mockMvc), code).andExpect(status().isOk());

        join(ApiUsers.create(mockMvc), code).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ROOM_FULL"));
    }

    @Test
    void 정원과_비밀번호를_생략하면_최대_인원의_공개방이다() throws Exception {
        User host = ApiUsers.create(mockMvc);

        createRoom(host, "공개방").andExpect(status().isCreated())
                .andExpect(jsonPath("$.maxPlayers").value(5))
                .andExpect(jsonPath("$.locked").value(false));
    }
}
