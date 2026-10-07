package com.boardgame.oldmaid;

import java.util.List;

@FunctionalInterface
public interface OldMaidShuffler {

    List<PlayingCard> shuffle(List<PlayingCard> cards);
}
