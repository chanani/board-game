package com.boardgame.room.domain;

import com.boardgame.game.GameAction;
import com.boardgame.game.GameOutcome;
import com.boardgame.game.GameSession;
import com.boardgame.game.PendingActor;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Random;

public class RoomGame {

    private final GameSession session;
    private final MatchStamp stamp;
    private final Departures departures = new Departures();

    public RoomGame(GameSession session, String matchKey, Instant startedAt) {
        this(session, matchKey, startedAt, false);
    }

    public RoomGame(GameSession session, String matchKey, Instant startedAt, boolean practice) {
        this.session = session;
        this.stamp = new MatchStamp(matchKey, startedAt, practice);
    }

    public boolean isPractice() {
        return stamp.practice();
    }

    public GameSession session() {
        return session;
    }

    public String matchKey() {
        return stamp.matchKey();
    }

    public Instant startedAt() {
        return stamp.startedAt();
    }

    public boolean isFinished() {
        return session.isFinished();
    }

    public boolean isPlaying(long memberId) {
        return session.isPlaying(memberId);
    }

    public List<GameOutcome> act(long memberId, GameAction action) {
        return session.act(memberId, action);
    }

    public Optional<Object> signal(long memberId, GameAction action) {
        return session.signal(memberId, action);
    }

    public List<GameOutcome> forfeit(long memberId) {
        return session.forfeit(memberId);
    }

    public List<GameOutcome> autoAct(Random random) {
        return session.autoAct(random);
    }

    public Optional<Instant> deadline() {
        return session.deadline();
    }

    public int roundNumber() {
        return session.roundNumber();
    }

    public List<PendingActor> pendingActors() {
        return session.pendingActors();
    }

    /** 방을 나간 사람을 기억한다. 다시 들어와도 이 게임이 끝난 뒤라면 결과 화면을 받지 않는다. */
    public void depart(long memberId) {
        departures.add(memberId);
    }

    /** 게임 중에 관전으로 돌아온 사람은 끝까지 지켜보므로 결과 화면을 다시 받는다. */
    public void rejoin(long memberId) {
        departures.remove(memberId);
    }

    /** 끝난 게임의 화면은 끝날 때까지 방에 남아 있던 사람에게만 준다. */
    public Optional<Object> viewFor(long memberId) {
        if (session.isFinished() && departures.contains(memberId)) {
            return Optional.empty();
        }
        return Optional.of(session.viewFor(memberId));
    }
}
