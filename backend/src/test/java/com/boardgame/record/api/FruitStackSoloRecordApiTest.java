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

// 수박게임 혼자 하기 S6: 승패·평균 점수에 넣지 않고 최고 점수만 남긴다.
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class FruitStackSoloRecordApiTest {

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

    private String soloRoom(User host) throws Exception {
        String created = mockMvc.perform(post("/api/rooms").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"혼자 방\", \"gameType\": \"FRUIT_STACK\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(created, "$.code");
    }

    private void start(String code, User host) throws Exception {
        mockMvc.perform(post("/api/rooms/{code}/start", code).session(host.session()))
                .andExpect(status().isOk());
    }

    private ResultActions statsOf(User user) throws Exception {
        return mockMvc.perform(get("/api/records/me").session(user.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stats[3].gameType").value("FRUIT_STACK"));
    }

    @Test
    void S6_혼자_한_판은_승패와_평균_점수에_들어가지_않고_최고_점수만_남는다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        String code = soloRoom(host);
        start(code, host);

        roomService.act(code, host.id(), score(40));
        roomService.act(code, host.id(), out(50));

        statsOf(host)
                .andExpect(jsonPath("$.stats[3].bestSoloScore").value(50))
                .andExpect(jsonPath("$.stats[3].matches").value(0))
                .andExpect(jsonPath("$.stats[3].wins").value(0))
                .andExpect(jsonPath("$.stats[3].rounds").value(0))
                .andExpect(jsonPath("$.stats[3].averageRoundScore").value(nullValue()))
                .andExpect(jsonPath("$.stats[0].bestSoloScore").value(nullValue()));
        mockMvc.perform(get("/api/records/members/{id}/matches", host.id()).param("gameType", "FRUIT_STACK")
                        .session(host.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(post("/api/rooms/{code}/leave", code).session(host.session()));
    }

    // 같은 테스트 트랜잭션에서 전적을 두 번 읽으면 처음 읽은 값이 남으므로 한 번만 읽는다.
    @Test
    void S6_낮은_점수는_최고_점수를_바꾸지_않는다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        String code = soloRoom(host);
        start(code, host);
        roomService.act(code, host.id(), out(60));
        start(code, host);

        roomService.act(code, host.id(), out(30));

        statsOf(host).andExpect(jsonPath("$.stats[3].bestSoloScore").value(60));
        mockMvc.perform(post("/api/rooms/{code}/leave", code).session(host.session()));
    }

    @Test
    void S6_더_높은_점수는_최고_점수를_바꾸고_다른_사람의_전적에도_보인다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        String code = soloRoom(host);
        start(code, host);
        roomService.act(code, host.id(), out(60));
        start(code, host);

        roomService.act(code, host.id(), out(90));

        mockMvc.perform(get("/api/records/members/{id}", host.id()).session(host.session()))
                .andExpect(jsonPath("$.stats[3].bestSoloScore").value(90));
        mockMvc.perform(post("/api/rooms/{code}/leave", code).session(host.session()));
    }

    @Test
    void S5_S6_게임_중에_나가도_그때까지의_점수가_최고_점수에_들어간다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        String code = soloRoom(host);
        start(code, host);
        roomService.act(code, host.id(), score(70));

        mockMvc.perform(post("/api/rooms/{code}/leave", code).session(host.session()))
                .andExpect(status().isNoContent());

        statsOf(host)
                .andExpect(jsonPath("$.stats[3].bestSoloScore").value(70))
                .andExpect(jsonPath("$.stats[3].losses").value(0));
    }
}
