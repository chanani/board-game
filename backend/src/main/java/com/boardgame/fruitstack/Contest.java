package com.boardgame.fruitstack;

import java.util.Optional;

// 참가자 묶음과 끝난 이유(R26). 끝난 뒤에는 바뀌지 않는다(호출하는 FruitStackGame이 막는다).
public class Contest {

    private final Stackers stackers;
    private FruitStackEndReason reason;

    public Contest(Stackers stackers) {
        this.stackers = stackers;
    }

    void report(PlayerId player, Score score, ScoreCeiling ceiling) {
        Stacker stacker = stackers.of(player);
        stacker.report(score, ceiling);
        settle();
    }

    // R20: 점수를 받아들인 뒤 탈락시킨다(점수가 거절되면 탈락도 없다).
    void out(PlayerId player, Score score, ScoreCeiling ceiling) {
        Stacker stacker = stackers.of(player);
        stacker.report(score, ceiling);
        stacker.goOut();
        settle();
    }

    void forfeit(PlayerId player) {
        if (!stackers.contains(player)) {
            return;
        }
        Stacker stacker = stackers.of(player);
        if (stacker.forfeit()) {
            settle();
        }
    }

    void end(FruitStackEndReason why) {
        reason = why;
    }

    boolean isOver() {
        return reason != null;
    }

    Optional<FruitStackEndReason> reason() {
        return Optional.ofNullable(reason);
    }

    Stackers stackers() {
        return stackers;
    }

    private void settle() {
        Optional<FruitStackEndReason> verdict = stackers.verdict();
        verdict.ifPresent(found -> reason = found);
    }
}
