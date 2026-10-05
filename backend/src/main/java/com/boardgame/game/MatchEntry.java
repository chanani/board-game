package com.boardgame.game;

public record MatchEntry(long memberId, ResultType result, int tokens, int seat) {
}
