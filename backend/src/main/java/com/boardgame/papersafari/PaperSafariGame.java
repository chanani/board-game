package com.boardgame.papersafari;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.papersafari.view.PaperSafariView;
import com.boardgame.papersafari.view.RoundResultView;
import java.util.List;
import java.util.Optional;
import java.util.Random;

public class PaperSafariGame {

    private final Seats seats;
    private final PaperSafariRound round;
    private final AutoActors autoActors;

    private PaperSafariGame(Seats seats, PaperSafariRound round) {
        this.seats = seats;
        this.round = round;
        this.autoActors = new AutoActors();
    }

    public static PaperSafariGame start(List<PlayerId> players, RoundFactory factory) {
        Seats seats = Seats.of(players);
        return new PaperSafariGame(seats, factory.create(seats));
    }

    public void flipInitial(PlayerId player, Position position) {
        humanAction(() -> round.flipInitial(player, position));
    }

    public void drawFromDeck(PlayerId player) {
        humanAction(() -> round.drawFromDeck(player));
    }

    public void drawFromDiscard(PlayerId player) {
        humanAction(() -> round.drawFromDiscard(player));
    }

    public void cancelDraw(PlayerId player) {
        humanAction(() -> round.cancelDraw(player));
    }

    public void swapAt(PlayerId player, Position position) {
        humanAction(() -> round.swapAt(player, position));
    }

    public void discardDrawn(PlayerId player) {
        humanAction(() -> round.discardDrawn(player));
    }

    public void peekAt(PlayerId player, Position position) {
        humanAction(() -> round.peekAt(player, position));
    }

    public void forfeit(PlayerId player) {
        humanAction(() -> round.leave(player));
    }

    // 시간 초과: 지금 기다리는 행동을 대신 하고, 누구 대신이었는지 기억한다.
    public void autoAct(Random random) {
        requireInProgress();
        autoActors.replaceWith(round.autoAct(random));
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
        return viewFor(viewer, TurnTiming.untimed());
    }

    public PaperSafariView viewFor(PlayerId viewer, TurnTiming timing) {
        RoundResultView result = lastRoundResult().map(RoundResult::toView).orElse(null);
        Long winnerId = winner().map(PlayerId::value).orElse(null);
        return new PaperSafariView(
                viewer.value(),
                status(),
                roundNumber().value(),
                round.viewFor(viewer),
                result,
                winnerId,
                timing.deadline(),
                timing.serverNow(),
                autoActors.firstId(),
                autoActors.ids(),
                autoActors.sequence());
    }

    private RoundOutcome drawUnlessForfeited(PlayerId player) {
        if (!isSeated(player)) {
            return RoundOutcome.LOSE;
        }
        return RoundOutcome.DRAW;
    }

    // 사람의 행동(기권 포함)이 성공하면 직전 자동 행동 표시를 지운다. 거부된 행동은 표시를 건드리지 않는다.
    private void humanAction(Runnable action) {
        requireInProgress();
        action.run();
        autoActors.clear();
    }

    private void requireInProgress() {
        if (status() == GameStatus.GAME_OVER) {
            throw new BusinessException(ErrorCode.GAME_ALREADY_OVER);
        }
    }
}
