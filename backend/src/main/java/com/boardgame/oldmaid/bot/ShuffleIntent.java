package com.boardgame.oldmaid.bot;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;

// R36: 섞기 결정 하나를 실제로 섞을 때까지 지킨다(우노 CatchWindow와 같은 모양).
// key(상은 뽑힐 차례 번호, 중은 조커 도착 번호)마다 섞을 시각을 한 번 정하고, 같은 key로 다시 물으면 남은 시간으로 답한다.
// 다른 방송으로 예약이 취소돼도 결정이 사라지지 않는다. 내 SHUFFLE 사건을 화면에서 볼 때만 그 key를 끝낸 것으로 친다.
// 쿨다운 중이면 버리지 않고 쿨다운이 끝나는 때로 정한다.
final class ShuffleIntent {

    private final OwnShuffles own = new OwnShuffles();
    private Pending pending;
    private Long doneKey;

    /** 화면을 본다. 새로 섞은 것을 보면 정해 둔 key를 끝내고 참. */
    boolean observe(OldMaidSight sight) {
        if (!own.observe(sight)) {
            return false;
        }
        doneKey = Optional.ofNullable(pending)
                .map(Pending::key)
                .orElse(doneKey);
        pending = null;
        return true;
    }

    /** 이 key로 지금부터 얼마 뒤에 섞을지. 이미 섞었으면 빈 값. */
    Optional<Duration> delay(long key, Instant now, Duration think) {
        if (Objects.equals(doneKey, key)) {
            return Optional.empty();
        }
        if (pending == null || pending.key() != key) {
            pending = new Pending(key, latest(now.plus(think), own.cooledAt()));
        }
        return Optional.of(remaining(now));
    }

    private Duration remaining(Instant now) {
        Duration left = Duration.between(now, pending.at());
        if (left.isNegative()) {
            return Duration.ZERO;
        }
        return left;
    }

    private static Instant latest(Instant first, Instant second) {
        if (first.isBefore(second)) {
            return second;
        }
        return first;
    }

    private record Pending(long key, Instant at) {
    }
}
