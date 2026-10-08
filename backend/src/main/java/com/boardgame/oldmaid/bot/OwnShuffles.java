package com.boardgame.oldmaid.bot;

import java.time.Duration;
import java.time.Instant;

// 내가 실제로 섞은 기록. 화면의 공개 사건에서 내 SHUFFLE을 볼 때만 센다(계획만 하고 취소된 섞기는 세지 않는다).
// 서버 쿨다운(1초)에 여유를 둬 마지막으로 섞은 화면 시각에서 1.1초가 지나야 다시 섞는다.
final class OwnShuffles {

    private static final Duration COOLDOWN = Duration.ofMillis(1100);

    private long seenSeq = -1;
    private Instant last = Instant.MIN;

    /** 새로 본 내 SHUFFLE 사건이 있으면 그 화면 시각을 기억하고 참. */
    boolean observe(OldMaidSight sight) {
        long seq = sight.myLatestShuffleSeq();
        if (seq <= seenSeq) {
            return false;
        }
        seenSeq = seq;
        last = sight.serverNow();
        return true;
    }

    /** 다시 섞을 수 있는 가장 이른 때. */
    Instant cooledAt() {
        if (last.equals(Instant.MIN)) {
            return Instant.MIN;
        }
        return last.plus(COOLDOWN);
    }
}
