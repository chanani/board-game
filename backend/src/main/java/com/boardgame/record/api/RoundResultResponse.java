package com.boardgame.record.api;

import com.boardgame.game.ResultType;

public record RoundResultResponse(int roundNumber, ResultType result, int score) {
}
