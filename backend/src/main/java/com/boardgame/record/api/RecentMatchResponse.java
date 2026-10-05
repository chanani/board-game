package com.boardgame.record.api;

import com.boardgame.game.GameType;
import com.boardgame.game.ResultType;
import java.time.Instant;
import java.util.List;

public record RecentMatchResponse(long matchId, GameType gameType, Instant startedAt, Instant endedAt,
                                  ResultType result, int tokens, List<MatchPlayerResponse> players,
                                  List<RoundResultResponse> rounds) {
}
