package com.boardgame.papersafari;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.papersafari.view.RoundView;
import java.util.List;
import java.util.Optional;
import java.util.Random;

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

    // 시간 초과: 지금 기다리는 행동을 대신 한다. 대신 행동한 사람들을 돌려준다.
    public List<PlayerId> autoAct(Random random) {
        PositionPicker picker = new PositionPicker(random);
        if (turn.isSettingUp()) {
            return autoFlip(picker);
        }
        PlayerId current = currentPlayer();
        autoPlay(current, picker);
        return List.of(current);
    }

    private List<PlayerId> autoFlip(PositionPicker picker) {
        List<PlayerId> pending = boards.notFlipped();
        pending.forEach(player -> boards.flipInitial(player, anyFaceDown(player, picker)));
        startPlayingIfReady();
        return pending;
    }

    private void autoPlay(PlayerId current, PositionPicker picker) {
        turn.requirePlaying();
        if (turn.phase() == TurnPhase.PEEK) {
            autoPeek(current, picker);
            return;
        }
        autoDrawIfNeeded(current);
        swapAt(current, picker.any());
    }

    private void autoDrawIfNeeded(PlayerId current) {
        if (turn.phase() != TurnPhase.DRAW) {
            return;
        }
        if (table.discardTop().isEmpty()) {
            drawFromDeck(current);
            return;
        }
        drawFromDiscard(current);
    }

    private void autoPeek(PlayerId current, PositionPicker picker) {
        Optional<Position> target = picker.anyOf(faceDownOf(current));
        if (target.isEmpty()) {
            finishTurn();
            return;
        }
        peekAt(current, target.get());
    }

    private Position anyFaceDown(PlayerId player, PositionPicker picker) {
        Optional<Position> position = picker.anyOf(faceDownOf(player));
        return position.orElseThrow();
    }

    private List<Position> faceDownOf(PlayerId player) {
        Board board = boards.boardOf(player);
        return board.faceDownPositions();
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

    public void cancelDraw(PlayerId player) {
        turn.require(player, TurnPhase.PLACE);
        DrawnCard drawn = turn.drawn();
        drawn.validateCancelable();
        table.discard(drawn.card());
        turn.putBack();
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

    public RoundView viewFor(PlayerId viewer) {
        return new RoundView(
                turn.phase(),
                currentPlayer().value(),
                table.deckSize(),
                table.discardTopView(),
                turn.heldViewFor(viewer),
                boards.viewFor(viewer));
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
