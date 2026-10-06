package com.boardgame.papersafari;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.papersafari.view.PaperSafariView;
import com.boardgame.papersafari.view.RoundResultView;
import java.util.List;
import java.util.Optional;

public class PaperSafariGame {

    private final Seats seats;
    private final PaperSafariRound round;

    private PaperSafariGame(Seats seats, PaperSafariRound round) {
        this.seats = seats;
        this.round = round;
    }

    public static PaperSafariGame start(List<PlayerId> players, RoundFactory factory) {
        Seats seats = Seats.of(players);
        return new PaperSafariGame(seats, factory.create(seats));
    }

    public void flipInitial(PlayerId player, Position position) {
        requireInProgress();
        round.flipInitial(player, position);
    }

    public void drawFromDeck(PlayerId player) {
        requireInProgress();
        round.drawFromDeck(player);
    }

    public void drawFromDiscard(PlayerId player) {
        requireInProgress();
        round.drawFromDiscard(player);
    }

    public void cancelDraw(PlayerId player) {
        requireInProgress();
        round.cancelDraw(player);
    }

    public void swapAt(PlayerId player, Position position) {
        requireInProgress();
        round.swapAt(player, position);
    }

    public void discardDrawn(PlayerId player) {
        requireInProgress();
        round.discardDrawn(player);
    }

    public void peekAt(PlayerId player, Position position) {
        requireInProgress();
        round.peekAt(player, position);
    }

    public void forfeit(PlayerId player) {
        requireInProgress();
        round.leave(player);
    }

    public GameStatus status() {
        if (round.isOver()) {
            return GameStatus.GAME_OVER;
        }
        if (seats.soleSurvivor().isPresent()) {
            return GameStatus.GAME_OVER;
        }
        return GameStatus.IN_ROUND;
    }

    public Optional<PlayerId> winner() {
        if (round.isOver()) {
            return round.result().winner();
        }
        return seats.soleSurvivor();
    }

    public RoundOutcome outcomeOf(PlayerId player) {
        Optional<PlayerId> winner = winner();
        if (winner.isEmpty()) {
            return drawUnlessForfeited(player);
        }
        return RoundOutcome.winOrLose(player.equals(winner.get()));
    }

    public Optional<RoundResult> lastRoundResult() {
        if (!round.isOver()) {
            return Optional.empty();
        }
        return Optional.of(round.result());
    }

    public RoundNumber roundNumber() {
        return RoundNumber.FIRST;
    }

    public PlayerId currentPlayer() {
        return round.currentPlayer();
    }

    public TurnPhase phase() {
        return round.phase();
    }

    public boolean isSeated(PlayerId player) {
        return seats.contains(player);
    }

    public PaperSafariView viewFor(PlayerId viewer) {
        RoundResultView result = lastRoundResult().map(RoundResult::toView).orElse(null);
        Long winnerId = winner().map(PlayerId::value).orElse(null);
        return new PaperSafariView(
                viewer.value(),
                status(),
                roundNumber().value(),
                round.viewFor(viewer),
                result,
                winnerId);
    }

    private RoundOutcome drawUnlessForfeited(PlayerId player) {
        if (!isSeated(player)) {
            return RoundOutcome.LOSE;
        }
        return RoundOutcome.DRAW;
    }

    private void requireInProgress() {
        if (status() == GameStatus.GAME_OVER) {
            throw new BusinessException(ErrorCode.GAME_ALREADY_OVER);
        }
    }
}
