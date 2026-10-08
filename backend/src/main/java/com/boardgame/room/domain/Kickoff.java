package com.boardgame.room.domain;

import java.time.Instant;
import java.util.Optional;

// 게임 시작 카운트다운. 방장이 시작을 누르면 startsAt에 게임이 시작되고, 그전까지 방은 대기실 그대로 잠긴다.
public final class Kickoff {

    private static final Kickoff NONE = new Kickoff(null);

    private final Instant startsAt;

    private Kickoff(Instant startsAt) {
        this.startsAt = startsAt;
    }

    public static Kickoff none() {
        return NONE;
    }

    public static Kickoff at(Instant startsAt) {
        return new Kickoff(startsAt);
    }

    public boolean isPending() {
        return startsAt != null;
    }

    public boolean isAt(Instant at) {
        return isPending() && startsAt.equals(at);
    }

    public Optional<Instant> startsAt() {
        return Optional.ofNullable(startsAt);
    }
}
