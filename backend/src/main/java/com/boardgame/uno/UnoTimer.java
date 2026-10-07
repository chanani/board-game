package com.boardgame.uno;

import com.boardgame.game.turn.AutoActorLog;
import com.boardgame.game.turn.StageCountdown;
import com.boardgame.game.turn.StageTiming;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

// D14·D15: 단계 순번이 바뀔 때만 다시 재는 15초 마감과 자동 행동 기록(공통 부품 사용).
public class UnoTimer {

    public static final Duration LIMIT = Duration.ofSeconds(15);

    private final StageCountdown<StageSeq> countdown;
    private final AutoActorLog autoActors = new AutoActorLog();

    public UnoTimer(Clock clock, StageSeq start) {
        this.countdown = new StageCountdown<>(clock, LIMIT, start);
    }

    public void humanActed(StageSeq now) {
        autoActors.clear();
        countdown.follow(now);
    }

    public void autoActed(PlayerId actor, StageSeq now) {
        autoActors.replaceWith(List.of(actor.value()));
        countdown.follow(now);
    }

    public void follow(StageSeq now) {
        countdown.follow(now);
    }

    public Instant deadline() {
        return countdown.deadline();
    }

    public StageTiming timing(boolean waiting) {
        return countdown.timing(waiting);
    }

    public AutoActorLog autoActors() {
        return autoActors;
    }
}
