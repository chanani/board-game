package com.boardgame.uno.view;

import com.boardgame.uno.ChallengeReveal;
import com.boardgame.uno.UnoColor;
import java.util.List;

// R22: playerId = +4를 낸 사람(공개되는 손패의 주인). previousColor = 판정 기준인 +4 직전의 색.
public record UnoRevealView(long playerId, List<UnoCardView> cards, boolean guilty, UnoColor previousColor) {

    public static UnoRevealView of(ChallengeReveal reveal) {
        return new UnoRevealView(reveal.charged().value(), UnoCardView.listOf(reveal.cards()), reveal.guilty(),
                reveal.previousColor().orElse(null));
    }
}
