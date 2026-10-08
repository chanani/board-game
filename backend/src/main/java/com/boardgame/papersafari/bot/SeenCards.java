package com.boardgame.papersafari.bot;

import com.boardgame.papersafari.DrawSource;
import com.boardgame.papersafari.view.CardView;
import com.boardgame.papersafari.view.HeldView;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

// R27: 상이 기억하는 공개된 카드. 버린 더미에 묻힌 카드는 화면에서 사라지므로 맨 위가 바뀔 때마다 쌓아 두고,
// 누가 버린 더미에서 가져가면(들고 있는 카드의 출처가 DISCARD) 맨 위를 뺀다. 모두 자기 화면에서 본 것뿐이다(R16).
final class SeenCards {

    private final List<CardView> pile = new ArrayList<>();
    private HeldView lastHeld;

    void observe(SafariSight sight) {
        noteTaken(sight.held().orElse(null));
        sight.discardTop().ifPresent(this::notePushed);
    }

    List<CardView> seenWith(SafariSight sight) {
        return Stream.concat(pile.stream(), sight.visibleCards().stream()).toList();
    }

    private void noteTaken(HeldView held) {
        boolean fresh = held != null && !held.equals(lastHeld);
        lastHeld = held;
        if (fresh && held.source() == DrawSource.DISCARD && !pile.isEmpty()) {
            pile.remove(pile.size() - 1);
        }
    }

    private void notePushed(CardView top) {
        if (!pile.isEmpty() && pile.get(pile.size() - 1).equals(top)) {
            return;
        }
        pile.add(top);
    }
}
