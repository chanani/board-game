package com.boardgame.uno;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

// 첫 섞기에는 준비한 순서를 그대로 돌려주고, 그 뒤(더미 다시 만들기·기권 카드 묻기·첫 +4 다시 넣기)는 받은 순서 그대로 둔다.
public final class StackedUnoShuffler implements UnoShuffler {

    private final Deque<List<UnoCard>> stacks;

    private StackedUnoShuffler(List<List<UnoCard>> stacks) {
        this.stacks = new ArrayDeque<>(stacks);
    }

    public static StackedUnoShuffler of(List<UnoCard> stack) {
        return new StackedUnoShuffler(List.of(stack));
    }

    @Override
    public List<UnoCard> shuffle(List<UnoCard> cards) {
        if (stacks.isEmpty()) {
            return new ArrayList<>(cards);
        }
        return new ArrayList<>(stacks.poll());
    }
}
