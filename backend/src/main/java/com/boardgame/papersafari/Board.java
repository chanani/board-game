package com.boardgame.papersafari;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

public class Board {

    public static final int SIZE = 6;

    private final Map<Position, Slot> slots;

    private Board(Map<Position, Slot> slots) {
        this.slots = slots;
    }

    public static Board deal(List<Card> cards) {
        if (cards.size() != SIZE) {
            throw new IllegalArgumentException("판에는 카드 6장이 필요합니다: " + cards.size());
        }
        List<Position> positions = Position.all();
        Map<Position, Slot> slots = new LinkedHashMap<>();
        IntStream.range(0, SIZE).forEach(index -> slots.put(positions.get(index), Slot.faceDown(cards.get(index))));
        return new Board(slots);
    }

    public void reveal(Position position) {
        slots.put(position, slotAt(position).reveal());
    }

    public void revealAll() {
        Position.all().forEach(this::reveal);
    }

    public Card replace(Position position, Card card) {
        Card previous = cardAt(position);
        slots.put(position, Slot.faceUp(card));
        return previous;
    }

    public Slot slotAt(Position position) {
        return slots.get(position);
    }

    public Card cardAt(Position position) {
        return slotAt(position).card();
    }

    public boolean isFaceDown(Position position) {
        return !slotAt(position).isFaceUp();
    }

    public boolean hasFaceUp() {
        return slots.values().stream().anyMatch(Slot::isFaceUp);
    }

    public boolean hasFaceDown() {
        return slots.values().stream().anyMatch(slot -> !slot.isFaceUp());
    }

    public List<Position> faceDownPositions() {
        return Position.all().stream()
                .filter(this::isFaceDown)
                .toList();
    }

    public boolean allFaceUp() {
        return !hasFaceDown();
    }

    public Score score() {
        return BoardScore.of(this).total();
    }
}
