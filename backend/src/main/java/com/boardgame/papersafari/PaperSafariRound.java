package com.boardgame.papersafari;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.Optional;

public class PaperSafariRound {

    private final Table table;
    private final PlayerBoards boards;
    private final Turn turn;

    private PaperSafariRound(Table table, PlayerBoards boards, Turn turn) {
        this.table = table;
        this.boards = boards;
        this.turn = turn;
    }

    public static PaperSafariRound start(Seats seats, PlayerId starter, CardShuffler shuffler) {
        Table table = Table.setUp(shuffler);
        PlayerBoards boards = PlayerBoards.deal(seats, table);
        table.openDiscard();
        return new PaperSafariRound(table, boards, Turn.setUp(seats, starter));
    }

    public void flipInitial(PlayerId player, Position position) {
        turn.requirePhase(TurnPhase.SETUP_FLIP);
        boards.flipInitial(player, position);
        startPlayingIfReady();
    }

    public void drawFromDeck(PlayerId player) {
        turn.require(player, TurnPhase.DRAW);
        turn.hold(new DrawnCard(table.drawFromDeck(), DrawSource.DECK));
    }

    public void drawFromDiscard(PlayerId player) {
        turn.require(player, TurnPhase.DRAW);
        turn.hold(new DrawnCard(table.drawFromDiscard(), DrawSource.DISCARD));
    }

    public void swapAt(PlayerId player, Position position) {
        turn.require(player, TurnPhase.PLACE);
        DrawnCard drawn = turn.drawn();
        Card replaced = boards.replace(player, position, drawn.card());
        sendAway(player, position, replaced, drawn);
        if (drawn.triggersElephant() && boards.hasFaceDown(player)) {
            turn.awaitPeek();
            return;
        }
        finishTurn();
    }

    public void peekAt(PlayerId player, Position position) {
        turn.require(player, TurnPhase.PEEK);
        boards.peek(player, position);
        finishTurn();
    }

    public boolean knows(PlayerId player, Position position) {
        return boards.knows(player, position);
    }

    public void discardDrawn(PlayerId player) {
        turn.require(player, TurnPhase.PLACE);
        DrawnCard drawn = turn.drawn();
        drawn.validateDiscardable();
        table.discard(drawn.card());
        finishTurn();
    }

    public void leave(PlayerId player) {
        turn.leave(player).ifPresent(drawn -> table.discard(drawn.card()));
        removeBoardUnlessOver(player);
        startPlayingIfReady();
    }

    private void removeBoardUnlessOver(PlayerId player) {
        if (isOver()) {
            return;
        }
        boards.remove(player);
    }

    public boolean isOver() {
        return turn.isRoundOver();
    }

    public RoundResult result() {
        if (!isOver()) {
            throw new BusinessException(ErrorCode.ROUND_NOT_OVER);
        }
        return RoundResult.of(boards.scores());
    }

    public TurnPhase phase() {
        return turn.phase();
    }

    public PlayerId currentPlayer() {
        return turn.current();
    }

    public Board boardOf(PlayerId player) {
        return boards.boardOf(player);
    }

    public Optional<Card> discardTop() {
        return table.discardTop();
    }

    public int deckSize() {
        return table.deckSize();
    }

    private void startPlayingIfReady() {
        if (!turn.isSettingUp() || !boards.everyoneFlipped()) {
            return;
        }
        turn.beginPlaying();
    }

    private void sendAway(PlayerId player, Position position, Card replaced, DrawnCard drawn) {
        if (drawn.triggersTarzan()) {
            pushToLeft(player, position, replaced);
            return;
        }
        table.discard(replaced);
    }

    private void pushToLeft(PlayerId player, Position position, Card card) {
        PlayerId left = turn.leftOf(player);
        table.discard(boards.replace(left, position, card));
    }

    private void finishTurn() {
        if (boards.anyAllFaceUp()) {
            boards.revealAll();
            turn.finishRound();
            return;
        }
        turn.passToNext();
    }
}
