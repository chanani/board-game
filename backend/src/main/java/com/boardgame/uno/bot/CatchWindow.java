package com.boardgame.uno.bot;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.function.Supplier;

// R32: 잡기 창(대상)마다 반응할지(남이면 잡기, 나면 외치기)·언제 할지를 한 번만 정한다. 구동기는 상태가 바뀔 때마다 다시 묻기 때문에
// 같은 창에서는 처음 정한 대로(남은 시간만) 답하고, 창이 닫히면 잊는다. 같은 대상의 새 창은 다시 정한다.
final class CatchWindow {

    private Long target;
    private Instant catchAt;

    /** decision: 처음 볼 때만 부른다. 빈 값 = 이 창에서는 잡지 않는다. 돌려주는 값은 지금부터 남은 시간. */
    Optional<Duration> decide(long open, Instant now, Supplier<Optional<Duration>> decision) {
        if (!isSeen(open)) {
            remember(open, now, decision.get());
        }
        return remaining(now);
    }

    void forgetIfClosed(Optional<Long> open) {
        if (open.filter(this::isSeen).isPresent()) {
            return;
        }
        target = null;
        catchAt = null;
    }

    private boolean isSeen(long open) {
        return target != null && target == open;
    }

    private void remember(long open, Instant now, Optional<Duration> delay) {
        target = open;
        catchAt = delay.map(now::plus)
                .orElse(null);
    }

    private Optional<Duration> remaining(Instant now) {
        return Optional.ofNullable(catchAt)
                .map(at -> Duration.between(now, at))
                .map(left -> left.isNegative() ? Duration.ZERO : left);
    }
}
