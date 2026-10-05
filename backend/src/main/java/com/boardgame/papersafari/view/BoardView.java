package com.boardgame.papersafari.view;

import java.util.List;

public record BoardView(long playerId, List<SlotView> slots) {
}
