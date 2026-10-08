package com.boardgame.uno;

import static com.boardgame.uno.UnoColor.BLUE;
import static com.boardgame.uno.UnoColor.GREEN;
import static com.boardgame.uno.UnoColor.RED;
import static com.boardgame.uno.UnoColor.YELLOW;
import static com.boardgame.uno.UnoFixtures.A;
import static com.boardgame.uno.UnoFixtures.B;
import static com.boardgame.uno.UnoFixtures.C;
import static com.boardgame.uno.UnoFixtures.filler;
import static com.boardgame.uno.UnoFixtures.game;
import static com.boardgame.uno.UnoFixtures.num;
import static com.boardgame.uno.UnoFixtures.skip;
import static com.boardgame.uno.UnoFixtures.wild;
import static com.boardgame.uno.UnoFixtures.wildFour;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class UnoAutoActTest {

    private static final UnoCard FIRST = num(RED, 5);

    private static List<UnoCard> pileStartingWith(UnoCard top) {
        List<UnoCard> pile = new ArrayList<>(List.of(top));
        pile.addAll(filler(10));
        return pile;
    }

    private static UnoGame threePlayers(List<UnoCard> aHand, UnoCard first, List<UnoCard> drawPile) {
        return game(List.of(A, B, C), List.of(aHand, List.of(num(GREEN, 2), num(BLUE, 2)), List.of(num(GREEN, 4), num(BLUE, 4))), first, drawPile);
    }

    @Test
    void R40_PLAY_시간_초과면_1장을_뽑고_낼_수_있어도_갖고_넘긴다() {
        UnoGame game = threePlayers(List.of(num(RED, 1), num(RED, 2)), FIRST, pileStartingWith(num(RED, 9)));

        PlayerId acted = game.autoAct();

        assertThat(acted).isEqualTo(A);
        assertThat(game.cardCount(A)).isEqualTo(3);
        assertThat(game.actor()).isEqualTo(B);
        assertThat(game.latestEvents()).extracting(UnoEvent::type).containsExactly(UnoEventType.DRAW, UnoEventType.PASS);
        assertThat(game.latestEvents()).allMatch(UnoEvent::auto);
    }

    @Test
    void R40_PLAY_시간_초과에_뽑을_카드가_없으면_그냥_넘긴다() {
        UnoGame game = game(List.of(A, B), List.of(List.of(num(BLUE, 1)), List.of(num(GREEN, 1))), FIRST, List.of());

        game.autoAct();

        assertThat(game.actor()).isEqualTo(B);
        assertThat(game.latestEvents().get(0).reason()).isEqualTo(UnoEventReason.EMPTY_PILE);
    }

    @Test
    void R40_DRAWN_시간_초과면_갖고_넘긴다() {
        UnoGame game = threePlayers(List.of(num(RED, 1), num(RED, 2)), FIRST, pileStartingWith(num(RED, 9)));
        game.draw(A);

        game.autoAct();

        assertThat(game.cardCount(A)).isEqualTo(3);
        assertThat(game.actor()).isEqualTo(B);
        assertThat(game.latestEvents().get(0).reason()).isEqualTo(UnoEventReason.KEEP);
    }

    @Test
    void R40_색_고르기_시간_초과면_가장_많은_색을_고르고_같은_사람이_이어서_한다() {
        UnoGame game = threePlayers(List.of(num(GREEN, 1), num(GREEN, 3)), wild(0), filler(10));

        game.autoAct();

        assertThat(game.currentColor()).contains(GREEN);
        assertThat(game.actor()).isEqualTo(A);
        assertThat(game.stage()).isEqualTo(UnoStage.PLAY);
        assertThat(game.latestEvents()).extracting(UnoEvent::type).containsExactly(UnoEventType.COLOR);
    }

    @Test
    void R40_색_장수가_같으면_빨강_노랑_초록_파랑_순으로_고른다() {
        UnoGame game = threePlayers(List.of(skip(YELLOW), num(BLUE, 3)), wild(0), filler(10));

        game.autoAct();

        assertThat(game.currentColor()).contains(YELLOW);
    }

    @Test
    void R40_색_카드가_없으면_빨강을_고른다() {
        UnoGame game = threePlayers(List.of(wild(1), wildFour(0)), wild(0), filler(10));

        game.autoAct();

        assertThat(game.currentColor()).contains(RED);
    }

    @Test
    void R25_시간_초과_자동_행동도_잡기_창을_닫는다() {
        UnoGame game = threePlayers(List.of(num(RED, 1), num(RED, 2)), FIRST, filler(10));
        game.play(A, num(RED, 1).id(), ChosenColor.none());

        game.autoAct();

        assertThat(game.catchTarget()).isEmpty();
    }
}
