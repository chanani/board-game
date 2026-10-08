package com.boardgame.uno;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

// 우노 선언한 사람들과 잡기 창 대상(R23~R27). 미리 외치기는 없다: 1장이 되는 순간 창이 열리고, 그 창 동안 본인이 외친다.
public class UnoCalls {

    private final Set<PlayerId> declared = new HashSet<>();
    private PlayerId catchable;

    // R23·R25: 카드를 내 1장이 남으면 잡기 창을 연다(본인은 외치고, 남은 잡는다).
    public void settle(PlayerId player, int handSize) {
        if (handSize != 1) {
            return;
        }
        catchable = player;
    }

    // R27: 잡기 창 동안 본인이 외치면 선언되고 창이 닫힌다.
    public void declare(PlayerId player) {
        declared.add(player);
        catchable = null;
    }

    // R24: 1장인 사람이 카드를 받아 2장 이상이 되면 선언이 풀린다.
    public void undeclare(PlayerId player) {
        declared.remove(player);
    }

    public boolean isDeclared(PlayerId player) {
        return declared.contains(player);
    }

    public void closeCatch() {
        catchable = null;
    }

    public Optional<PlayerId> catchTarget() {
        return Optional.ofNullable(catchable);
    }

    public boolean isCatchable(PlayerId player) {
        return player.equals(catchable);
    }

    // R35
    public void forget(PlayerId player) {
        declared.remove(player);
        if (player.equals(catchable)) {
            catchable = null;
        }
    }
}
