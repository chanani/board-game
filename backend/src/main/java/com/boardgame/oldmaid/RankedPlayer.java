package com.boardgame.oldmaid;

public record RankedPlayer(PlayerId player, FinishRank rank, Placement placement) {

    private static final FinishRank FIRST = new FinishRank(1);

    public boolean isWinner() {
        return rank.equals(FIRST);
    }

    public boolean isLastHolder() {
        return placement == Placement.THIEF || placement == Placement.LAST_STANDING;
    }
}
