package com.boardgame.papersafari;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.papersafari.view.HeldView;
import java.util.Optional;

public class Turn {

    private final Seats seats;
    private PlayerId current;
    private Step step;

    private Turn(Seats seats, PlayerId current, Step step) {
        this.seats = seats;
        this.current = current;
        this.step = step;
    }

    public static Turn setUp(Seats seats, PlayerId starter) {
        return new Turn(seats, starter, Step.of(TurnPhase.SETUP_FLIP));
    }

    public void requirePhase(TurnPhase phase) {
        if (!step.isIn(phase)) {
            throw new BusinessException(ErrorCode.INVALID_PHASE);
        }
    }

    public void require(PlayerId player, TurnPhase phase) {
        requirePhase(phase);
        if (!current.equals(player)) {
            throw new BusinessException(ErrorCode.NOT_YOUR_TURN);
        }
    }

    public void beginPlaying() {
        step = Step.of(TurnPhase.DRAW);
    }

    public void hold(DrawnCard drawn) {
        step = Step.placing(drawn);
    }

    public DrawnCard drawn() {
        return step.drawn();
    }

    public void awaitPeek() {
        step = Step.of(TurnPhase.PEEK);
    }

    public void passToNext() {
        current = seats.next(current);
        step = Step.of(TurnPhase.DRAW);
    }

    public void finishRound() {
        step = Step.of(TurnPhase.ROUND_OVER);
    }

    public boolean isRoundOver() {
        return step.isIn(TurnPhase.ROUND_OVER);
    }

    public boolean isSettingUp() {
        return step.isIn(TurnPhase.SETUP_FLIP);
    }

    public PlayerId leftOf(PlayerId player) {
        return seats.leftOf(player);
    }

    public PlayerId current() {
        return current;
    }

    public TurnPhase phase() {
        return step.phase();
    }

    public Optional<DrawnCard> leave(PlayerId player) {
        seats.requireSeated(player);
        Optional<DrawnCard> released = releaseCurrent(player);
        seats.remove(player);
        return released;
    }

    public HeldView heldViewFor(PlayerId viewer) {
        return step.held()
                .map(drawn -> HeldView.of(current, drawn, current.equals(viewer)))
                .orElse(null);
    }

    private Optional<DrawnCard> releaseCurrent(PlayerId player) {
        if (!current.equals(player)) {
            return Optional.empty();
        }
        Optional<DrawnCard> released = step.held();
        current = seats.next(player);
        step = step.afterLeave();
        return released;
    }
}
