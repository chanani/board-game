package com.boardgame.record.api;

import com.boardgame.game.ResultType;

public record MatchPlayerResponse(long memberId, String nickname, ResultType result, int tokens) {
}
