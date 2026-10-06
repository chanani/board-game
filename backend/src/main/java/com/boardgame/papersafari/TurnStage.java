package com.boardgame.papersafari;

// 마감을 새로 잡을지 가르는 "지금 누가 어떤 단계를 기다리는가". 같은 차례 안의 가져오기↔놓기 오가기는 같은 차례로 본다.
public record TurnStage(RoundNumber round, PlayerId player, TurnPhase phase) {

    public static TurnStage of(PaperSafariGame game) {
        return new TurnStage(game.roundNumber(), game.currentPlayer(), game.phase());
    }

    public boolean sameTurnAs(TurnStage previous) {
        if (!isDrawOrPlace() || !previous.isDrawOrPlace()) {
            return false;
        }
        return round.equals(previous.round) && player.equals(previous.player);
    }

    private boolean isDrawOrPlace() {
        return phase == TurnPhase.DRAW || phase == TurnPhase.PLACE;
    }
}
