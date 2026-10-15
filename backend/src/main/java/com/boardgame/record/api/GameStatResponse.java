package com.boardgame.record.api;

import com.boardgame.game.GameType;
import com.boardgame.record.domain.MemberGameStat;
import com.boardgame.record.domain.ResultCounts;
import com.boardgame.record.domain.RoundRecord;

public record GameStatResponse(GameType gameType, String gameTypeName, int matches, int wins, int draws, int losses,
                               Double winRate, int rounds, int roundWins, int roundDraws, int roundLosses,
                               Double roundWinRate, Double averageRoundScore, Integer bestSoloScore) {

    /** bestSoloScore: 혼자 한 게임의 최고 점수(수박게임 S6). 혼자 한 적이 없으면 null. */
    public static GameStatResponse from(MemberGameStat stat, Integer bestSoloScore) {
        GameType gameType = stat.gameType();
        ResultCounts matches = stat.matches();
        RoundRecord rounds = stat.rounds();
        ResultCounts roundCounts = rounds.counts();
        return new GameStatResponse(gameType, gameType.displayName(), matches.total(), matches.wins(),
                matches.draws(), matches.losses(), matches.winRate(), roundCounts.total(), roundCounts.wins(),
                roundCounts.draws(), roundCounts.losses(), rounds.winRate(), rounds.averageScore(), bestSoloScore);
    }
}
