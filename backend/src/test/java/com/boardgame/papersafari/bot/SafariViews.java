package com.boardgame.papersafari.bot;

import com.boardgame.papersafari.CardKind;
import com.boardgame.papersafari.DrawSource;
import com.boardgame.papersafari.GameStatus;
import com.boardgame.papersafari.TurnPhase;
import com.boardgame.papersafari.view.BoardView;
import com.boardgame.papersafari.view.CardView;
import com.boardgame.papersafari.view.HeldView;
import com.boardgame.papersafari.view.PaperSafariSessionView;
import com.boardgame.papersafari.view.PaperSafariView;
import com.boardgame.papersafari.view.RoundView;
import com.boardgame.papersafari.view.SlotView;
import java.util.List;
import java.util.stream.IntStream;

// 페이퍼 사파리 컴퓨터 테스트용 화면 만들기. 판은 위 줄 왼쪽부터 6칸(위 0·1·2, 아래 0·1·2), null = 모르는 뒷면.
final class SafariViews {

    static final long ME = -1L;
    static final long OTHER = -2L;

    private SafariViews() {
    }

    static CardView number(int value) {
        return new CardView(CardKind.NUMBER, value);
    }

    static CardView fox() {
        return new CardView(CardKind.FOX, -2);
    }

    static CardView wild() {
        return new CardView(CardKind.WILD, 0);
    }

    static CardView tarzan() {
        return new CardView(CardKind.TARZAN, 10);
    }

    static BoardView board(long playerId, CardView... cards) {
        List<SlotView> slots = IntStream.range(0, 6)
                .mapToObj(index -> new SlotView(index % 3, index / 3, cards[index] != null, false, cards[index]))
                .toList();
        return new BoardView(playerId, slots);
    }

    static HeldView fromDeck(CardView card) {
        return new HeldView(ME, DrawSource.DECK, card);
    }

    static HeldView fromDiscard(CardView card) {
        return new HeldView(ME, DrawSource.DISCARD, card);
    }

    static PaperSafariSessionView view(TurnPhase phase, long current, CardView top, HeldView held, BoardView... boards) {
        RoundView round = new RoundView(phase, current, 30, top, held, List.of(boards));
        return new PaperSafariSessionView(new PaperSafariView(ME, GameStatus.IN_ROUND, 1, round, null, null, null, 0L,
                null, List.of(), 0L));
    }

    static SafariSight sight(TurnPhase phase, CardView top, HeldView held, BoardView... boards) {
        return SafariSight.of(view(phase, ME, top, held, boards));
    }
}
