package com.boardgame.papersafari;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.papersafari.view.PaperSafariView;
import com.boardgame.papersafari.view.RoundResultView;
import java.util.List;
import java.util.Optional;

public class PaperSafariGame {

    private final Seats seats;
    private final Tokens tokens;
    private final RoundSequence rounds;

    private PaperSafariGame(Seats seats, Tokens tokens, RoundSequence rounds) {
        this.seats = seats;
        this.tokens = tokens;
        this.rounds = rounds;
    }

    public static PaperSafariGame start(List<PlayerId> players, RoundFactory factory) {
        Seats seats = Seats.of(players);
        return new PaperSafariGame(seats, Tokens.forPlayers(seats), RoundSequence.begin(factory, seats));
    }

    public void flipInitial(PlayerId player, Position position) {
        requireInProgress();
        round().flipInitial(player, position);
    }

    public void drawFromDeck(PlayerId player) {
        requireInProgress();
        round().drawFromDeck(player);
    }

    public void drawFromDiscard(PlayerId player) {
        requireInProgress();
        round().drawFromDiscard(player);
    }

    public void swapAt(PlayerId player, Position position) {
        requireInProgress();
        round().swapAt(player, position);
        settleRound();
    }

    public void discardDrawn(PlayerId player) {
        requireInProgress();
        round().discardDrawn(player);
        settleRound();
    }

    public void peekAt(PlayerId player, Position position) {
        requireInProgress();
        round().peekAt(player, position);
        settleRound();
    }

    public void startNextRound() {
        requireInProgress();
        if (!round().isOver()) {
            throw new BusinessException(ErrorCode.ROUND_NOT_OVER);
        }
        rounds.next(seats);
    }

    public void forfeit(PlayerId player) {
        requireInProgress();
        round().leave(player);
    }

    public GameStatus status() {
        if (winner().isPresent()) {
            return GameStatus.GAME_OVER;
        }
        if (round().isOver()) {
            return GameStatus.ROUND_OVER;
        }
        return GameStatus.IN_ROUND;
    }

    public Optional<PlayerId> winner() {
        return tokens.champion().or(seats::soleSurvivor);
    }

    public Optional<RoundResult> lastRoundResult() {
        if (!round().isOver()) {
            return Optional.empty();
        }
        return Optional.of(round().result());
    }

    public RoundNumber roundNumber() {
        return rounds.number();
    }

    public PlayerId currentPlayer() {
        return round().currentPlayer();
    }

    public TurnPhase phase() {
        return round().phase();
    }

    public TokenCount tokensOf(PlayerId player) {
        return tokens.countOf(player);
    }

    public PaperSafariView viewFor(PlayerId viewer) {
        RoundResultView result = lastRoundResult().map(RoundResult::toView).orElse(null);
        Long winnerId = winner().map(PlayerId::value).orElse(null);
        return new PaperSafariView(
                viewer.value(),
                status(),
                roundNumber().value(),
                round().viewFor(viewer),
                tokens.toView(),
                result,
                winnerId);
    }

    private PaperSafariRound round() {
        return rounds.current();
    }

    private void settleRound() {
        if (!round().isOver()) {
            return;
        }
        RoundResult result = round().result();
        result.winner().ifPresent(tokens::award);
    }

    private void requireInProgress() {
        if (winner().isPresent()) {
            throw new BusinessException(ErrorCode.GAME_ALREADY_OVER);
        }
    }
}
