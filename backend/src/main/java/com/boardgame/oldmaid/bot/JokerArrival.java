package com.boardgame.oldmaid.bot;

// 조커가 새로 손에 들어왔는데 아직 섞지 않았는지.
final class JokerArrival {

    private boolean held;
    private boolean pending;

    void observe(OldMaidSight sight) {
        boolean holds = sight.holdsJoker();
        pending = holds && (pending || !held);
        held = holds;
    }

    boolean take() {
        boolean was = pending;
        pending = false;
        return was;
    }
}
