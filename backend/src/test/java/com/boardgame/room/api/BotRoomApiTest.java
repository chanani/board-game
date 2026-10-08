package com.boardgame.room.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.boardgame.room.application.RoomNotifier;
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
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

@SpringBootTest
@AutoConfigureMockMvc
class BotRoomApiTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RoomNotifier notifier;

    private record Seat(User user, String code) {
    }

    // 컨텍스트를 같이 쓰는 다른 API 테스트와 회원 번호가 겹쳐 ALREADY_IN_ROOM이 나지 않게, 만든 방에서 모두 나온다.
    private final List<Seat> seats = new ArrayList<>();

    @AfterEach
    void leaveRooms() throws Exception {
        for (Seat seat : seats) {
            mockMvc.perform(post("/api/rooms/" + seat.code() + "/leave").session(seat.user().session()));
        }
    }

    private String createRoom(User host, String gameType, int maxPlayers) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/rooms").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name": "컴퓨터 방", "gameType": "%s", "maxPlayers": %d}
                                """.formatted(gameType, maxPlayers)))
                .andExpect(status().isCreated())
                .andReturn();
        String code = JsonPath.read(result.getResponse().getContentAsString(), "$.code");
        seats.add(new Seat(host, code));
        return code;
    }

    private ResultActions addBot(User user, String code, String difficulty) throws Exception {
        return mockMvc.perform(post("/api/rooms/" + code + "/bots").session(user.session())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"difficulty": "%s"}
                        """.formatted(difficulty)));
    }

    private ResultActions changeBot(User user, String code, long botId, String difficulty) throws Exception {
        return mockMvc.perform(patch("/api/rooms/" + code + "/bots/" + botId).session(user.session())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"difficulty": "%s"}
                        """.formatted(difficulty)));
    }

    @Test
    void R8_R15_방장이_컴퓨터를_추가하면_방_응답에_컴퓨터로_나온다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        String code = createRoom(host, "UNO", 4);

        addBot(host, code, "HARD")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.members[1].id").value(-1))
                .andExpect(jsonPath("$.members[1].nickname").value("컴퓨터 1"))
                .andExpect(jsonPath("$.members[1].bot").value(true))
                .andExpect(jsonPath("$.members[1].difficulty").value("HARD"))
                .andExpect(jsonPath("$.members[1].ready").value(true))
                .andExpect(jsonPath("$.members[1].connected").value(true))
                .andExpect(jsonPath("$.members[1].host").value(false))
                .andExpect(jsonPath("$.members[0].bot").value(false))
                .andExpect(jsonPath("$.members[0].difficulty").doesNotExist());
    }

    @Test
    void R8_방장이_아니면_403_참가자가_아니면_403_잘못된_난이도는_400() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        User stranger = ApiUsers.create(mockMvc);
        String code = createRoom(host, "UNO", 4);
        mockMvc.perform(post("/api/rooms/" + code + "/join").session(guest.session())).andExpect(status().isOk());
        seats.add(new Seat(guest, code));

        addBot(guest, code, "EASY").andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_ROOM_HOST"));
        addBot(stranger, code, "EASY").andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_IN_ROOM"));
        addBot(host, code, "NORMAL").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void R9_꽉_차면_정원이_늘고_게임_최대_인원이면_409_ROOM_FULL() throws Exception {
        User host = ApiUsers.create(mockMvc);
        String code = createRoom(host, "PAPER_SAFARI", 2);

        addBot(host, code, "EASY").andExpect(jsonPath("$.maxPlayers").value(2));
        addBot(host, code, "EASY").andExpect(jsonPath("$.maxPlayers").value(3));
        addBot(host, code, "EASY").andExpect(jsonPath("$.maxPlayers").value(4));
        addBot(host, code, "EASY").andExpect(jsonPath("$.maxPlayers").value(5));
        addBot(host, code, "EASY").andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ROOM_FULL"));
    }

    @Test
    void R10_R11_난이도를_바꾸고_없으면_404_내보내기도_된다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        String code = createRoom(host, "OLD_MAID", 6);
        addBot(host, code, "EASY");

        changeBot(host, code, -1, "MEDIUM").andExpect(status().isOk())
                .andExpect(jsonPath("$.members[1].difficulty").value("MEDIUM"));
        changeBot(host, code, -5, "MEDIUM").andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("BOT_NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("컴퓨터를 찾을 수 없어요."));
        mockMvc.perform(post("/api/rooms/" + code + "/members/-1/kick").session(host.session()))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/rooms/" + code).session(host.session()))
                .andExpect(jsonPath("$.members.length()").value(1));
    }

    @Test
    void R44_방장과_컴퓨터만으로_시작하고_게임_중에는_추가_바꾸기가_409() throws Exception {
        User host = ApiUsers.create(mockMvc);
        String code = createRoom(host, "PAPER_SAFARI", 4);
        addBot(host, code, "EASY");

        mockMvc.perform(post("/api/rooms/" + code + "/start").session(host.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PLAYING"));
        addBot(host, code, "EASY").andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ROOM_ALREADY_PLAYING"));
        changeBot(host, code, -1, "HARD").andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ROOM_ALREADY_PLAYING"));
    }

    @Test
    void R13_사람이_모두_나가면_방이_사라진다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User other = ApiUsers.create(mockMvc);
        String code = createRoom(host, "UNO", 4);
        addBot(host, code, "EASY");

        mockMvc.perform(post("/api/rooms/" + code + "/leave").session(host.session()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/rooms/" + code).session(other.session()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("ROOM_NOT_FOUND"));
        mockMvc.perform(get("/api/rooms/me").session(host.session()))
                .andExpect(status().isNoContent());
    }
}
