package com.boardgame.uno;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class RandomUnoShuffler implements UnoShuffler {

    @Override
    public List<UnoCard> shuffle(List<UnoCard> cards) {
        List<UnoCard> copy = new ArrayList<>(cards);
        Collections.shuffle(copy);
        return copy;
    }
}
