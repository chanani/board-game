// UnoResultPlayerView.java
package com.boardgame.uno.view;

import java.util.List;

public record UnoResultPlayerView(long playerId, List<UnoCardView> cards, int points) {
}
