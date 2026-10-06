// UnoRevealView.java
package com.boardgame.uno.view;

import com.boardgame.uno.ChallengeReveal;
import java.util.List;

// R22: playerId = +4를 낸 사람(공개되는 손패의 주인).
public record UnoRevealView(long playerId, List<UnoCardView> cards, boolean guilty) {

    public static UnoRevealView of(ChallengeReveal reveal) {
        return new UnoRevealView(reveal.charged().value(), UnoCardView.listOf(reveal.cards()), reveal.guilty());
    }
}
