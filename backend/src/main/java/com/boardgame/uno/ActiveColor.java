package com.boardgame.uno;

import java.util.Optional;

// 현재 색. 첫 카드가 WILD면 고르기 전까지 비어 있다(color == null).
public record ActiveColor(UnoColor color) {

    public static ActiveColor of(UnoCard card) {
        return new ActiveColor(card.color());
    }

    public Optional<UnoColor> value() {
        return Optional.ofNullable(color);
    }
}
