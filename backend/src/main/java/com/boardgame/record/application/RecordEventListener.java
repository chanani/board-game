package com.boardgame.record.application;

import com.boardgame.game.event.GameCompletedEvent;
import com.boardgame.game.event.GameStartedEvent;
import com.boardgame.game.event.RoundCompletedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class RecordEventListener {

    private static final Logger log = LoggerFactory.getLogger(RecordEventListener.class);

    private final RecordService recordService;

    public RecordEventListener(RecordService recordService) {
        this.recordService = recordService;
    }

    @EventListener
    public void onStarted(GameStartedEvent event) {
        safely(() -> recordService.recordStart(event), event);
    }

    @EventListener
    public void onRoundCompleted(RoundCompletedEvent event) {
        safely(() -> recordService.recordRound(event), event);
    }

    @EventListener
    public void onGameCompleted(GameCompletedEvent event) {
        safely(() -> recordService.recordCompletion(event), event);
    }

    private void safely(Runnable action, Object event) {
        try {
            action.run();
        } catch (RuntimeException exception) {
            log.error("전적 기록에 실패했습니다: {}", event, exception);
        }
    }
}
