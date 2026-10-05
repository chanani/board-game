package com.boardgame.record.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;

import com.boardgame.game.GameCompleted;
import com.boardgame.game.GameType;
import com.boardgame.game.MatchEntry;
import com.boardgame.game.ResultType;
import com.boardgame.game.event.GameCompletedEvent;
import com.boardgame.record.domain.GameMatchRepository;
import com.boardgame.record.domain.MemberGameStatRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest
class RecordFailureIsolationTest {

    private static final Instant T0 = Instant.parse("2026-10-05T10:00:00Z");
    private static final Instant T1 = Instant.parse("2026-10-05T10:30:00Z");

    @Autowired
    private ApplicationEventPublisher events;

    @Autowired
    private TransactionTemplate transactionTemplate;

    @Autowired
    private GameMatchRepository matchRepository;

    @MockitoSpyBean
    private MemberGameStatRepository statRepository;

    @Test
    void 기록이_실패해도_호출자_트랜잭션은_커밋되고_기록만_롤백된다() {
        long a = ThreadLocalRandom.current().nextLong(1_000_000L, 1_000_000_000L);
        String key = UUID.randomUUID().toString();
        doThrow(new IllegalStateException("db down")).when(statRepository).findById(any());
        GameCompletedEvent event = new GameCompletedEvent(key, GameType.PAPER_SAFARI, T0, T1, new GameCompleted(
                List.of(new MatchEntry(a, ResultType.WIN, 3, 0), new MatchEntry(a + 1, ResultType.LOSE, 0, 1))));

        assertThatCode(() -> transactionTemplate.executeWithoutResult(status -> events.publishEvent(event)))
                .doesNotThrowAnyException();

        assertThat(matchRepository.findByMatchKey(key)).isEmpty();
    }
}
