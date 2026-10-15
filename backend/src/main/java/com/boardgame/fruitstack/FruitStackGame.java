package com.boardgame.fruitstack;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.OptionalLong;

// 한 경기. 물리는 모른다: 보고받은 점수·탈락·기권과 서버가 끝내러 오는 마감만 다룬다.
// 참가자가 한 명이면 혼자 하기(스펙 12장): 상한 없이 방치 마감(S4)만 있다.
public class FruitStackGame {

    private final FruitStackMatch match;
    private final Contest contest;
    private final SnapshotGates gates = new SnapshotGates();

    private FruitStackGame(FruitStackMatch match, Contest contest) {
        this.match = match;
        this.contest = contest;
    }

    public static FruitStackGame start(List<PlayerId> players, Seed seed, Clock clock) {
        Contest contest = new Contest(new Stackers(players));
        return new FruitStackGame(FruitStackMatch.start(seed, new MatchClock(clock), players.size()), contest);
    }

    public void report(PlayerId player, Score score) {
        requireRunning();
        contest.report(player, score, match.ceiling());
        match.touch();
    }

    public void out(PlayerId player, Score score) {
        requireRunning();
        contest.out(player, score, match.ceiling());
        match.touch();
    }

    public void forfeit(PlayerId player) {
        if (isFinished()) {
            return;
        }
        contest.forfeit(player);
    }

    // R17·S4: 마감이 지났고 아직 안 끝났을 때만 끝낸다(대결은 TIME_UP, 혼자 하기는 ABANDONED).
    public boolean expire() {
        if (isFinished() || !match.isExpired()) {
            return false;
        }
        MatchLimit limit = match.limit();
        contest.end(limit.reason());
        return true;
    }

    // R24: 받아 주면 그 사람의 신호 순번, 아니면 빈 값. 점수·상태·끝은 바뀌지 않는다.
    public OptionalLong relay(PlayerId player, String board) {
        BoardSnapshot snapshot = new BoardSnapshot(board);
        if (!mayRelay(player) || !snapshot.isValid()) {
            return OptionalLong.empty();
        }
        OptionalLong seq = gates.tryPass(player, now());
        seq.ifPresent(ignored -> match.touch());
        return seq;
    }

    // 게임 중이고 기권하지 않은 참가자(살아 있거나 탈락)만 판을 보낸다.
    private boolean mayRelay(PlayerId player) {
        Stackers stackers = contest.stackers();
        return !isFinished() && stackers.contains(player) && stackers.isContender(player);
    }

    // S1: 참가자가 한 명인 게임.
    public boolean isSolo() {
        Stackers stackers = contest.stackers();
        return stackers.isSolo();
    }

    // 화면에 남은 시간이 보이는 경기인지(대결의 10분 상한). 혼자 하기는 상한이 없다(S3).
    public boolean isTimed() {
        MatchLimit limit = match.limit();
        return limit.isShown();
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

    // 서버가 끝내러 오는 시각: 대결은 시작 + 10분, 혼자 하기는 마지막으로 받아 준 보고·신호 + 5분.
    public Instant limitAt() {
        return match.deadline();
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
