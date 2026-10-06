package com.boardgame.uno;

public record UnoCard(CardId id, CardFace face) {

    public boolean matches(UnoCard top, UnoColor current) {
        return face.matches(top.face, current);
    }

    public boolean hasId(CardId other) {
        return id.equals(other);
    }

    public CardKind kind() {
        return face.kind();
    }

    public UnoColor color() {
        return face.color();
    }

    public boolean isWild() {
        CardKind kind = face.kind();
        return kind.isWild();
    }

    public boolean isColor(UnoColor target) {
        return face.isColor(target);
    }

    public UnoPoints points() {
        return new UnoPoints(face.points());
    }
}
