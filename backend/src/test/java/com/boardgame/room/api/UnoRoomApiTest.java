package com.boardgame.room.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.boardgame.room.application.RoomNotifier;
import com.boardgame.room.application.RoomService;
import com.boardgame.support.ApiUsers;
import com.boardgame.support.ApiUsers.User;
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
import com.jayway.jsonpath.JsonPath;

@SpringBootTest
@AutoConfigureMockMvc
class UnoRoomApiTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RoomNotifier notifier;

    @Autowired
    private RoomService roomService;

    // 만든 방은 공유 컨텍스트의 방 등록부에 남지 않도록 끝나면 방장이 나간다.
    private final List<Object[]> openRooms = new ArrayList<>();

    @AfterEach
    void closeRooms() {
        openRooms.forEach(room -> roomService.leave((String) room[0], (Long) room[1]));
    }

    private ResultActions create(User host, Integer maxPlayers) throws Exception {
        String body = maxPlayers == null
                ? "{\"name\": \"우노 방\", \"gameType\": \"UNO\"}"
                : "{\"name\": \"우노 방\", \"gameType\": \"UNO\", \"maxPlayers\": %d}".formatted(maxPlayers);
        ResultActions created = mockMvc.perform(post("/api/rooms").session(host.session())
                .contentType(MediaType.APPLICATION_JSON).content(body));
        String response = created.andReturn().getResponse().getContentAsString();
        if (created.andReturn().getResponse().getStatus() == 201) {
            openRooms.add(new Object[]{JsonPath.read(response, "$.code"), host.id()});
        }
        return created;
    }

    @Test
    void 우노_방을_만들면_게임_이름과_최대_인원이_붙는다() throws Exception {
        User host = ApiUsers.create(mockMvc);

        create(host, null)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.gameType").value("UNO"))
                .andExpect(jsonPath("$.gameTypeName").value("우노"))
                .andExpect(jsonPath("$.maxPlayers").value(5));
    }

    @Test
    void 우노_방은_2명에서_5명까지만_만들_수_있다() throws Exception {
        create(ApiUsers.create(mockMvc), 6)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_CAPACITY"));
        create(ApiUsers.create(mockMvc), 2)
                .andExpect(status().isCreated());
    }

    @Test
    void 혼자서는_우노를_시작할_수_없다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        String body = create(host, null).andReturn().getResponse().getContentAsString();
        String code = com.jayway.jsonpath.JsonPath.read(body, "$.code");

        mockMvc.perform(post("/api/rooms/{code}/start", code).session(host.session()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("NOT_ENOUGH_PLAYERS"));
    }
}
