package com.boardgame.uno.view;

import com.boardgame.uno.CardFace;
import com.boardgame.uno.CardKind;
import com.boardgame.uno.CardNumber;
import com.boardgame.uno.UnoCard;
import com.boardgame.uno.UnoColor;
import java.util.List;

public record UnoCardView(int id, CardKind kind, UnoColor color, Integer number) {

    public static UnoCardView of(UnoCard card) {
        CardFace face = card.face();
        CardNumber number = face.number();
        Integer value = number == null ? null : number.value();
        return new UnoCardView(card.id().value(), face.kind(), face.color(), value);
    }

    public static List<UnoCardView> listOf(List<UnoCard> cards) {
        return cards.stream()
                .map(UnoCardView::of)
                .toList();
    }
}
