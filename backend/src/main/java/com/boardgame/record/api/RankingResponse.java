package com.boardgame.record.api;

public record RankingResponse(int rank, long memberId, String nickname, int matches, int wins, int draws,
                              int losses, double winRate) {
}
