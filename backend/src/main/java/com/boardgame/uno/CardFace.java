package com.boardgame.uno;

// 카드 그림. 와일드는 color가 null, 숫자 카드만 number가 있다.
public record CardFace(CardKind kind, UnoColor color, CardNumber number) {

    public static CardFace number(UnoColor color, int value) {
        return new CardFace(CardKind.NUMBER, color, new CardNumber(value));
    }

    public static CardFace action(CardKind kind, UnoColor color) {
        return new CardFace(kind, color, null);
    }

    public static CardFace wild(CardKind kind) {
        return new CardFace(kind, null, null);
    }

    // R8: 현재 색, 같은 숫자, 같은 기능, 또는 와일드. 맨 위가 와일드면 선언된 색만 본다.
    public boolean matches(CardFace top, UnoColor current) {
        if (kind.isWild()) {
            return true;
        }
        if (isColor(current)) {
            return true;
        }
        if (top.kind.isWild()) {
            return false;
        }
        return sameSymbolAs(top);
    }

    private boolean sameSymbolAs(CardFace top) {
        if (kind != top.kind) {
            return false;
        }
        return kind != CardKind.NUMBER || number.equals(top.number);
    }

    // R3
    public int points() {
        if (kind == CardKind.NUMBER) {
            return number.value();
        }
        return kind.fixedPoints();
    }

    // 와일드(color null)는 어떤 색으로도 치지 않는다(R11).
    public boolean isColor(UnoColor target) {
        return target != null && color == target;
    }
}
