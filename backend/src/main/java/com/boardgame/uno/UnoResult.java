package com.boardgame.uno;

// R29·R31·R33: 끝난 이유, 이긴 사람, 얻은 점수(기권으로 끝나면 0).
public record UnoResult(UnoEndReason reason, PlayerId winner, UnoPoints points) {

    public static UnoResult emptyHand(PlayerId winner, UnoPoints points) {
        return new UnoResult(UnoEndReason.EMPTY_HAND, winner, points);
    }

    public static UnoResult forfeit(PlayerId winner) {
        return new UnoResult(UnoEndReason.FORFEIT, winner, UnoPoints.ZERO);
    }

    public boolean isWinner(PlayerId player) {
        return winner.equals(player);
    }

    public UnoEvent toEvent() {
        if (reason == UnoEndReason.FORFEIT) {
            return UnoEvent.gameEnd(winner, null, UnoEventReason.FORFEIT);
        }
        return UnoEvent.gameEnd(winner, points.value(), UnoEventReason.EMPTY_HAND);
    }
}
