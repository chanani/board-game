package com.boardgame.uno;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.IntStream;

// R1·R2: 색 순서(RED, YELLOW, GREEN, BLUE)마다 0, 1, 1, …, 9, 9, SKIP×2, REVERSE×2, DRAW_TWO×2 → WILD×4 → WILD_DRAW_FOUR×4.
public final class StandardUnoDeck {

    private static final List<CardKind> ACTIONS = List.of(CardKind.SKIP, CardKind.REVERSE, CardKind.DRAW_TWO);
    private static final int COPIES = 2;
    private static final int WILD_COPIES = 4;

    private StandardUnoDeck() {
    }

    public static List<UnoCard> cards() {
        List<CardFace> faces = new ArrayList<>();
        Arrays.stream(UnoColor.values()).forEach(color -> faces.addAll(colorFaces(color)));
        faces.addAll(Collections.nCopies(WILD_COPIES, CardFace.wild(CardKind.WILD)));
        faces.addAll(Collections.nCopies(WILD_COPIES, CardFace.wild(CardKind.WILD_DRAW_FOUR)));
        return IntStream.range(0, faces.size())
                .mapToObj(index -> new UnoCard(new CardId(index), faces.get(index)))
                .toList();
    }

    private static List<CardFace> colorFaces(UnoColor color) {
        List<CardFace> faces = new ArrayList<>();
        faces.add(CardFace.number(color, 0));
        IntStream.rangeClosed(1, 9).forEach(value -> faces.addAll(Collections.nCopies(COPIES, CardFace.number(color, value))));
        ACTIONS.forEach(kind -> faces.addAll(Collections.nCopies(COPIES, CardFace.action(kind, color))));
        return faces;
    }
}
