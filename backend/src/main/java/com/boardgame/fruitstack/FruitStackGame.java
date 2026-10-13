package com.boardgame.fruitstack;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

// 한 경기. 물리는 모른다: 보고받은 점수·탈락·기권과 경기 상한만 다룬다.
public class FruitStackGame {

    private final FruitStackMatch match;
    private final Contest contest;

    private FruitStackGame(FruitStackMatch match, Contest contest) {
        this.match = match;
        this.contest = contest;
    }

    public static FruitStackGame start(List<PlayerId> players, Seed seed, Clock clock) {
        Contest contest = new Contest(new Stackers(players));
        return new FruitStackGame(new FruitStackMatch(seed, new MatchClock(clock)), contest);
    }

    public void report(PlayerId player, Score score) {
        requireRunning();
        contest.report(player, score, match.ceiling());
    }

    public void out(PlayerId player, Score score) {
        requireRunning();
        contest.out(player, score, match.ceiling());
    }

    public void forfeit(PlayerId player) {
        if (isFinished()) {
            return;
        }
        contest.forfeit(player);
    }

    // R17: 상한이 지났고 아직 안 끝났을 때만 끝낸다.
    public boolean timeUp() {
        MatchClock clock = match.clock();
        if (isFinished() || !clock.isTimeUp()) {
            return false;
        }
        contest.timeUp();
        return true;
    }

    public boolean isFinished() {
        return contest.isOver();
    }

    // R28·R29: 게임 중이고 그 사람이 살아 있을 때만 true.
    public boolean isPlaying(PlayerId player) {
        Stackers stackers = contest.stackers();
        return !isFinished() && stackers.contains(player) && stackers.isPlaying(player);
    }

    public Optional<FruitStackResult> result() {
        Optional<FruitStackEndReason> reason = contest.reason();
        return reason.map(found -> new FruitStackResult(found, Standings.of(contest.stackers())));
    }

    public List<PlayerId> participants() {
        Stackers stackers = contest.stackers();
        return stackers.ids();
    }

    public Score scoreOf(PlayerId player) {
        Stackers stackers = contest.stackers();
        return stackers.scoreOf(player);
    }

    public PlayerState stateOf(PlayerId player) {
        Stackers stackers = contest.stackers();
        return stackers.stateOf(player);
    }

    public Seed seed() {
        return match.seed();
    }

    public Instant startedAt() {
        MatchClock clock = match.clock();
        return clock.startedAt();
    }

    public Instant limitAt() {
        MatchClock clock = match.clock();
        return clock.limitAt();
    }

    public Instant now() {
        MatchClock clock = match.clock();
        return clock.now();
    }

    private void requireRunning() {
        if (isFinished()) {
            throw new BusinessException(ErrorCode.GAME_ALREADY_OVER);
        }
    }
}
