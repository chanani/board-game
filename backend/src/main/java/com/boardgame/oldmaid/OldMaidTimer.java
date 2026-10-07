package com.boardgame.oldmaid;

import com.boardgame.game.turn.AutoActorLog;
import com.boardgame.game.turn.StageCountdown;
import com.boardgame.game.turn.StageTiming;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

// R34: 차례 순번이 바뀔 때만 다시 재는 15초 마감과 자동 행동 기록(공통 부품, D11).
public class OldMaidTimer {

    public static final Duration LIMIT = Duration.ofSeconds(15);

    private final StageCountdown<TurnSeq> countdown;
    private final AutoActorLog autoActors = new AutoActorLog();

    public OldMaidTimer(Clock clock, TurnSeq start) {
        this.countdown = new StageCountdown<>(clock, LIMIT, start);
    }

    public void humanActed(TurnSeq now) {
        autoActors.clear();
        countdown.follow(now);
    }

    public void autoActed(PlayerId actor, TurnSeq now) {
        autoActors.replaceWith(List.of(actor.value()));
        countdown.follow(now);
    }

    public void follow(TurnSeq now) {
        countdown.follow(now);
    }

    public Instant deadline() {
        return countdown.deadline();
    }

    public Instant now() {
        return countdown.now();
    }

    public StageTiming timing(boolean waiting) {
        return countdown.timing(waiting);
    }

    public AutoActorLog autoActors() {
        return autoActors;
    }
}
