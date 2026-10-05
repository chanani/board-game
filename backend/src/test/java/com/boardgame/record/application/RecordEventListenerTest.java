package com.boardgame.record.application;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.boardgame.game.GameCompleted;
import com.boardgame.game.GameType;
import com.boardgame.game.RoundCompleted;
import com.boardgame.game.event.GameCompletedEvent;
import com.boardgame.game.event.GameStartedEvent;
import com.boardgame.game.event.RoundCompletedEvent;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class RecordEventListenerTest {

    private static final Instant NOW = Instant.parse("2026-10-05T10:00:00Z");

    private final RecordService service = mock(RecordService.class);
    private final RecordEventListener listener = new RecordEventListener(service);

    @Test
    void 시작_기록이_실패해도_예외를_삼킨다() {
        GameStartedEvent event = new GameStartedEvent("k", GameType.PAPER_SAFARI, List.of(1L), NOW);
        doThrow(new IllegalStateException("db down")).when(service).recordStart(event);

        assertThatCode(() -> listener.onStarted(event)).doesNotThrowAnyException();
        verify(service).recordStart(event);
    }

    @Test
    void 라운드_기록이_실패해도_예외를_삼킨다() {
        RoundCompletedEvent event = new RoundCompletedEvent("k", GameType.PAPER_SAFARI,
                new RoundCompleted(1, List.of()));
        doThrow(new IllegalStateException("db down")).when(service).recordRound(event);

        assertThatCode(() -> listener.onRoundCompleted(event)).doesNotThrowAnyException();
        verify(service).recordRound(event);
    }

    @Test
    void 완료_기록이_실패해도_예외를_삼킨다() {
        GameCompletedEvent event = new GameCompletedEvent("k", GameType.PAPER_SAFARI, NOW, NOW,
                new GameCompleted(List.of()));
        doThrow(new IllegalStateException("db down")).when(service).recordCompletion(event);

        assertThatCode(() -> listener.onGameCompleted(event)).doesNotThrowAnyException();
        verify(service).recordCompletion(event);
    }
}
