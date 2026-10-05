package com.boardgame.papersafari;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

final class StackedShuffler implements CardShuffler {

    private final Deque<List<Card>> stacks;

    private StackedShuffler(List<List<Card>> stacks) {
        this.stacks = new ArrayDeque<>(stacks);
    }

    static StackedShuffler of(List<Card> stack) {
        return new StackedShuffler(List.of(stack));
    }

    static StackedShuffler rounds(List<List<Card>> stacks) {
        return new StackedShuffler(stacks);
    }

    @Override
    public List<Card> shuffle(List<Card> cards) {
        if (stacks.isEmpty()) {
            return new ArrayList<>(cards);
        }
        return new ArrayList<>(stacks.poll());
    }
}
