package com.boardgame.record.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.boardgame.game.event.GameCompletedEvent;
import com.boardgame.game.event.GameStartedEvent;
import com.boardgame.record.domain.GameMatchRepository;
import com.boardgame.record.domain.MatchParticipantRepository;
import com.boardgame.record.domain.MemberGameStatRepository;
import com.boardgame.room.application.RoomNotifier;
import com.boardgame.support.ApiUsers;
import com.boardgame.support.ApiUsers.User;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

// 다른 API 테스트와 컨텍스트·DB를 나눠 쓰지 않는다: 컨텍스트마다 회원 번호가 1부터 다시 시작해, 같은 레지스트리를 쓰는 다른 테스트의 방과 번호가 겹치면 ALREADY_IN_ROOM이 난다.
@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:practicedb;MODE=MySQL;DB_CLOSE_DELAY=-1")
@AutoConfigureMockMvc
@RecordApplicationEvents
class PracticeRecordApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ApplicationEvents events;

    @Autowired
    private GameMatchRepository matches;

    @Autowired
    private MatchParticipantRepository participants;

    @Autowired
    private MemberGameStatRepository stats;

    @MockitoBean
    private RoomNotifier notifier;

    @Test
    void R37_R38_컴퓨터가_낀_게임은_연습_경기이고_기록이_남지_않는다() throws Exception {
        long matchCount = matches.count();
        long participantCount = participants.count();
        long statCount = stats.count();
        User host = ApiUsers.create(mockMvc);
        MvcResult created = mockMvc.perform(post("/api/rooms").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name": "연습", "gameType": "PAPER_SAFARI"}
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        String code = JsonPath.read(created.getResponse().getContentAsString(), "$.code");
        mockMvc.perform(post("/api/rooms/" + code + "/bots").session(host.session())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"difficulty\": \"EASY\"}"));

        mockMvc.perform(post("/api/rooms/" + code + "/start").session(host.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.practice").value(true));
        mockMvc.perform(post("/api/rooms/" + code + "/leave").session(host.session()))
                .andExpect(status().isNoContent());

        assertThat(events.stream(GameStartedEvent.class)).isEmpty();
        assertThat(events.stream(GameCompletedEvent.class)).isEmpty();
        assertThat(matches.count()).isEqualTo(matchCount);
        assertThat(participants.count()).isEqualTo(participantCount);
        assertThat(stats.count()).isEqualTo(statCount);
    }
}
