package com.boardgame.record.api;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.boardgame.game.GameAction;
import com.boardgame.room.application.RoomService;
import com.boardgame.support.ApiUsers;
import com.boardgame.support.ApiUsers.User;
import com.jayway.jsonpath.JsonPath;
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
class FruitStackRecordApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RoomService roomService;

    private static GameAction score(int value) {
        return new GameAction("SCORE", null, null, null, null, null, null, null, value, null);
    }

    private static GameAction out(int value) {
        return new GameAction("OUT", null, null, null, null, null, null, null, value, null);
    }

    private String startedRoom(User host, User guest) throws Exception {
        String created = mockMvc.perform(post("/api/rooms").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"과일 전적 방\", \"gameType\": \"FRUIT_STACK\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String code = JsonPath.read(created, "$.code");
        mockMvc.perform(post("/api/rooms/{code}/join", code).session(guest.session()));
        mockMvc.perform(post("/api/rooms/{code}/ready", code).session(guest.session())
                .contentType(MediaType.APPLICATION_JSON).content("{\"ready\": true}"));
        mockMvc.perform(post("/api/rooms/{code}/start", code).session(host.session()))
                .andExpect(status().isOk());
        return code;
    }

    private ResultActions statsOf(User user) throws Exception {
        return mockMvc.perform(get("/api/records/me").session(user.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stats[3].gameType").value("FRUIT_STACK"));
    }

    private void leave(String code, User... users) throws Exception {
        for (User user : users) {
            mockMvc.perform(post("/api/rooms/{code}/leave", code).session(user.session()));
        }
    }

    @Test
    void R30_끝까지_한_판은_승패와_점수가_남는다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String code = startedRoom(host, guest);

        roomService.act(code, host.id(), score(50));
        roomService.act(code, guest.id(), out(30));

        statsOf(host)
                .andExpect(jsonPath("$.stats[3].gameTypeName").value("수박게임"))
                .andExpect(jsonPath("$.stats[3].wins").value(1))
                .andExpect(jsonPath("$.stats[3].rounds").value(1))
                .andExpect(jsonPath("$.stats[3].averageRoundScore").value(50.0));
        statsOf(guest)
                .andExpect(jsonPath("$.stats[3].losses").value(1))
                .andExpect(jsonPath("$.stats[3].averageRoundScore").value(30.0));
        mockMvc.perform(get("/api/records/members/{id}/matches", guest.id()).param("gameType", "FRUIT_STACK")
                        .session(guest.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].result").value("LOSE"))
                .andExpect(jsonPath("$[0].tokens").value(0))
                .andExpect(jsonPath("$[0].rounds[0].score").value(30));
        leave(code, guest, host);
    }

    @Test
    void R27_R30_최고_점수가_같으면_둘_다_무승부로_남는다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String code = startedRoom(host, guest);

        roomService.act(code, host.id(), out(20));
        roomService.act(code, guest.id(), out(20));

        statsOf(host)
                .andExpect(jsonPath("$.stats[3].draws").value(1))
                .andExpect(jsonPath("$.stats[3].averageRoundScore").value(20.0));
        statsOf(guest)
                .andExpect(jsonPath("$.stats[3].draws").value(1))
                .andExpect(jsonPath("$.stats[3].averageRoundScore").value(20.0));
        leave(code, guest, host);
    }

    @Test
    void R30_상대가_나가_끝난_판은_경기만_남고_평균_점수에는_들어가지_않는다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String code = startedRoom(host, guest);
        roomService.act(code, host.id(), score(40));

        mockMvc.perform(post("/api/rooms/{code}/leave", code).session(guest.session()))
                .andExpect(status().isNoContent());

        statsOf(host)
                .andExpect(jsonPath("$.stats[3].wins").value(1))
                .andExpect(jsonPath("$.stats[3].rounds").value(0))
                .andExpect(jsonPath("$.stats[3].averageRoundScore").value(nullValue()));
        statsOf(guest)
                .andExpect(jsonPath("$.stats[3].losses").value(1))
                .andExpect(jsonPath("$.stats[3].rounds").value(0));
        leave(code, host);
    }
}
