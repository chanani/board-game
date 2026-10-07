package com.boardgame.oldmaid;

import com.boardgame.game.turn.AutoActorLog;
import com.boardgame.game.turn.StageCountdown;
import com.boardgame.game.turn.StageTiming;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

// R34·R38: 차례 순번이나 단계가 바뀔 때만 다시 재는 마감(처음 버리기 30초, 뽑기·짝 버리기 15초)과 자동 행동 기록(공통 부품, D11).
public class OldMaidTimer {

    public static final Duration LIMIT = Duration.ofSeconds(15);
    public static final Duration OPENING_LIMIT = Duration.ofSeconds(30);

    private final StageCountdown<TurnStep> countdown;
    private final AutoActorLog autoActors = new AutoActorLog();

    public OldMaidTimer(Clock clock, TurnStep start) {
        this.countdown = new StageCountdown<>(clock, OldMaidTimer::limitOf, start);
    }

    static Duration limitOf(TurnStep step) {
        if (step.is(OldMaidStage.OPENING_DISCARD)) {
            return OPENING_LIMIT;
        }
        return LIMIT;
    }

    public void humanActed(TurnStep now) {
        autoActors.clear();
        countdown.follow(now);
    }

    public void autoActed(List<PlayerId> actors, TurnStep now) {
        autoActors.replaceWith(actors.stream()
                .map(PlayerId::value)
                .toList());
        countdown.follow(now);
    }

    public void follow(TurnStep now) {
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
