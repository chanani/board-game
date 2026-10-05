package com.boardgame.papersafari.view;

import java.util.List;

public record PaperSafariSessionView(PaperSafariView game, List<Long> readyPlayerIds) {
}
