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

    // 같은 차례에서 놓을 단계가 가져올 단계로 돌아왔다면 가져오기를 되돌린 것이다.
    public boolean cancelsDrawFrom(TurnStage previous) {
        return sameTurnAs(previous) && previous.phase == TurnPhase.PLACE && phase == TurnPhase.DRAW;
    }

    // 같은 차례에서 단계도 그대로라면(다른 사람의 기권 따위) 기다리는 행동이 바뀌지 않은 것이다.
    public boolean holdsStageOf(TurnStage previous) {
        return sameTurnAs(previous) && phase == previous.phase;
    }

    private boolean isDrawOrPlace() {
        return phase == TurnPhase.DRAW || phase == TurnPhase.PLACE;
    }
}
