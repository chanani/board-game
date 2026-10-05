package com.boardgame.papersafari.view;

import com.boardgame.papersafari.Position;
import com.boardgame.papersafari.Slot;

public record SlotView(int column, int row, boolean faceUp, boolean known, CardView card) {

    public static SlotView of(Position position, Slot slot, boolean knownByViewer) {
        boolean faceUp = slot.isFaceUp();
        boolean known = knownByViewer && !faceUp;
        CardView card = (faceUp || known) ? CardView.of(slot.card()) : null;
        return new SlotView(position.column(), position.row(), faceUp, known, card);
    }
}
