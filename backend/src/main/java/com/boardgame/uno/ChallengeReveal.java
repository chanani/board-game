package com.boardgame.uno;

import java.util.List;

// R22: 도전자 본인에게만 보여 줄 공개. 다음 상태 변화에서 지운다.
public record ChallengeReveal(PlayerId challenger, FourCharge charge) {

    public PlayerId charged() {
        return charge.by();
    }

    public List<UnoCard> cards() {
        return charge.handAfter();
    }

    public boolean guilty() {
        return !charge.legal();
    }

    public boolean isFor(PlayerId viewer) {
        return challenger.equals(viewer);
    }
}
