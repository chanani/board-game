package com.boardgame.uno;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

// 우노 외침(이번 차례), 우노 선언한 사람들, 잡기 창 대상(R23~R27).
public class UnoCalls {

    private PlayerId caller;
    private final Set<PlayerId> declared = new HashSet<>();
    private PlayerId catchable;

    public void call(PlayerId player) {
        caller = player;
    }

    public boolean hasCalled(PlayerId player) {
        return player.equals(caller);
    }

    // R23: 외친 상태는 그 차례가 끝나면 사라진다.
    public void endTurn() {
        caller = null;
    }

    // R24·R25: 카드를 내 1장이 남으면 외쳤는지에 따라 선언하거나 잡기 창을 연다.
    public void settle(PlayerId player, int handSize) {
        if (handSize != 1) {
            return;
        }
        if (hasCalled(player)) {
            declared.add(player);
            return;
        }
        catchable = player;
    }

    // R27: 잡기 창 동안 본인이 외치면 선언되고 창이 닫힌다.
    public void declareLate(PlayerId player) {
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
        if (player.equals(caller)) {
            caller = null;
        }
    }
}
