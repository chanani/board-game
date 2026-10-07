package com.boardgame.oldmaid;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class RandomOldMaidShuffler implements OldMaidShuffler {

    @Override
    public List<PlayingCard> shuffle(List<PlayingCard> cards) {
        List<PlayingCard> copy = new ArrayList<>(cards);
        Collections.shuffle(copy);
        return copy;
    }
}
