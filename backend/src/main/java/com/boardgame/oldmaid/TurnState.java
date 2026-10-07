package com.boardgame.oldmaid;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;

public class TurnState {

    private Turn turn;

    TurnState(Turn first) {
        this.turn = first;
    }

    public Turn current() {
        return turn;
    }

    public Turn requireDrawer(PlayerId player) {
        if (!turn.isDrawer(player)) {
            throw new BusinessException(ErrorCode.NOT_YOUR_TURN);
        }
        return turn;
    }

    public void begin(PlayerId drawer, PlayerId target) {
        turn = new Turn(drawer, target, turn.seq().next());
    }
}
