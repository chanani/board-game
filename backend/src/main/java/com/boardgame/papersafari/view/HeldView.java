package com.boardgame.papersafari.view;

import com.boardgame.papersafari.DrawSource;
import com.boardgame.papersafari.DrawnCard;
import com.boardgame.papersafari.PlayerId;

public record HeldView(long playerId, DrawSource source, CardView card) {

    public static HeldView of(PlayerId holder, DrawnCard drawn, boolean visible) {
        CardView card = visible ? CardView.of(drawn.card()) : null;
        return new HeldView(holder.value(), drawn.source(), card);
    }
}
