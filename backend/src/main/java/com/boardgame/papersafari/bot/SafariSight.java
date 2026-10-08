package com.boardgame.papersafari.bot;

import com.boardgame.papersafari.CardKind;
import com.boardgame.papersafari.DrawSource;
import com.boardgame.papersafari.TurnPhase;
import com.boardgame.papersafari.view.BoardView;
import com.boardgame.papersafari.view.CardView;
import com.boardgame.papersafari.view.HeldView;
import com.boardgame.papersafari.view.PaperSafariSessionView;
import com.boardgame.papersafari.view.PaperSafariView;
import com.boardgame.papersafari.view.RoundView;
import com.boardgame.papersafari.view.SlotView;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.IntStream;
import java.util.stream.Stream;

// R16: 컴퓨터 자리 화면(PaperSafariView)에서 판단에 쓰는 것만 꺼낸다. 남의 뒷면 카드는 화면에 없으므로 여기에도 없다.
public record SafariSight(long me, RoundView round) {

    private static final int COLUMNS = 3;

    public static SafariSight of(Object view) {
        PaperSafariView game = ((PaperSafariSessionView) view).game();
        return new SafariSight(game.viewerId(), game.round());
    }

    public TurnPhase phase() {
        return round.phase();
    }

    public boolean isMyTurn() {
        return round.currentPlayerId() == me;
    }

    // 지금 내 결정을 기다리는지: 처음 뒤집기는 내 판에 앞면이 없을 때, 그 밖에는 내 차례일 때.
    public boolean awaitsMe() {
        if (phase() == TurnPhase.SETUP_FLIP) {
            return mySlots().stream().noneMatch(SlotView::faceUp);
        }
        return phase().isPlaying() && isMyTurn();
    }

    public BoardView myBoard() {
        return round.boards()
                .stream()
                .filter(board -> board.playerId() == me)
                .findFirst()
                .orElseThrow();
    }

    public List<SlotView> mySlots() {
        BoardView board = myBoard();
        return board.slots();
    }

    public List<SlotView> myFaceDown() {
        return mySlots().stream()
                .filter(slot -> !slot.faceUp())
                .toList();
    }

    public SlotView mySlot(int column, int row) {
        return mySlots().stream()
                .filter(slot -> slot.column() == column && slot.row() == row)
                .findFirst()
                .orElseThrow();
    }

    public List<BoardView> opponents() {
        return round.boards()
                .stream()
                .filter(board -> board.playerId() != me)
                .toList();
    }

    public Optional<CardView> discardTop() {
        return Optional.ofNullable(round.discardTop());
    }

    public Optional<HeldView> held() {
        return Optional.ofNullable(round.held());
    }

    public CardView heldCard() {
        HeldView held = round.held();
        return held.card();
    }

    public boolean heldFromDeck() {
        return held().filter(held -> held.source() == DrawSource.DECK).isPresent();
    }

    public boolean heldIs(CardKind kind) {
        return held().map(HeldView::card)
                .filter(card -> card.kind() == kind)
                .isPresent();
    }

    // R26: 이 카드가 내 아는 카드와 같은 열에서 새 짝을 만드는지(이미 짝인 열은 빼고).
    public boolean pairsWithMine(CardView card) {
        return IntStream.range(0, COLUMNS).anyMatch(column -> completesPair(column, card));
    }

    public boolean partnerKnown(SlotView slot) {
        SlotView partner = mySlot(slot.column(), 1 - slot.row());
        return partner.card() != null;
    }

    // R27: 지금 화면에 보이는 카드(모든 앞면, 내가 아는 뒷면, 들고 있는 카드가 보이면 그것).
    public List<CardView> visibleCards() {
        Stream<CardView> boards = round.boards()
                .stream()
                .flatMap(board -> board.slots().stream())
                .map(SlotView::card)
                .filter(Objects::nonNull);
        Stream<CardView> held = held().map(HeldView::card)
                .stream()
                .filter(Objects::nonNull);
        return Stream.concat(boards, held).toList();
    }

    private boolean completesPair(int column, CardView card) {
        Guess top = Guess.of(mySlot(column, 0));
        Guess bottom = Guess.of(mySlot(column, 1));
        if (top.pairs(bottom)) {
            return false;
        }
        return top.matches(card) || bottom.matches(card);
    }
}
