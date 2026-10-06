package com.boardgame.uno;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static com.boardgame.uno.UnoColor.BLUE;
import static com.boardgame.uno.UnoColor.GREEN;
import static com.boardgame.uno.UnoColor.RED;
import static com.boardgame.uno.UnoFixtures.A;
import static com.boardgame.uno.UnoFixtures.B;
import static com.boardgame.uno.UnoFixtures.C;
import static com.boardgame.uno.UnoFixtures.D;
import static com.boardgame.uno.UnoFixtures.drawTwo;
import static com.boardgame.uno.UnoFixtures.filler;
import static com.boardgame.uno.UnoFixtures.game;
import static com.boardgame.uno.UnoFixtures.num;
import static com.boardgame.uno.UnoFixtures.reverse;
import static com.boardgame.uno.UnoFixtures.skip;
import static com.boardgame.uno.UnoFixtures.wild;
import static com.boardgame.uno.UnoFixtures.wildFour;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import java.util.List;
import org.junit.jupiter.api.Test;

class UnoSetupTest {

    private static final List<List<UnoCard>> THREE_HANDS = List.of(
            List.of(num(RED, 1)), List.of(num(GREEN, 1)), List.of(num(BLUE, 1)));
    private static final List<List<UnoCard>> TWO_HANDS = List.of(List.of(num(RED, 1)), List.of(num(GREEN, 1)));

    private static UnoGame identityDeckGame(int starterSeat) {
        UnoRoundFactory factory = new UnoRoundFactory(StackedUnoShuffler.of(StandardUnoDeck.cards()), count -> starterSeat);
        return UnoGame.start(List.of(A, B), factory);
    }

    @Test
    void R6_seat_0부터_한_장씩_7장을_나눠_주고_다음_장이_첫_카드다() {
        UnoGame game = identityDeckGame(0);

        assertThat(game.handOf(A)).extracting(card -> card.id().value()).containsExactly(0, 2, 4, 6, 8, 10, 12);
        assertThat(game.handOf(B)).extracting(card -> card.id().value()).containsExactly(1, 3, 5, 7, 9, 11, 13);
        assertThat(game.discardTop().id()).isEqualTo(new CardId(14));
        assertThat(game.drawPileSize()).isEqualTo(108 - 15);
        assertThat(game.discardSize()).isEqualTo(1);
    }

    @Test
    void R7_첫_카드가_숫자면_시작_사람부터_그_색으로_한다() {
        UnoGame game = identityDeckGame(0);

        assertThat(game.actor()).isEqualTo(A);
        assertThat(game.stage()).isEqualTo(UnoStage.PLAY);
        assertThat(game.currentColor()).contains(RED);
        assertThat(game.latestEvents()).extracting(UnoEvent::type).containsExactly(UnoEventType.START);
        assertThat(game.latestEvents().get(0).actor()).isEqualTo(A);
        assertThat(game.latestEvents().get(0).seq()).isEqualTo(1L);
    }

    @Test
    void R5_시작_사람은_StarterPicker가_고르고_첫_방향은_시계_방향이다() {
        UnoGame game = identityDeckGame(1);

        assertThat(game.actor()).isEqualTo(B);
        assertThat(game.direction()).isEqualTo(Direction.CLOCKWISE);
    }

    @Test
    void R7_첫_카드가_SKIP이면_시작_사람이_차례를_잃는다() {
        UnoGame game = game(List.of(A, B, C), THREE_HANDS, skip(RED), filler(5));

        assertThat(game.actor()).isEqualTo(B);
        assertThat(game.latestEvents()).extracting(UnoEvent::type).containsExactly(UnoEventType.SKIP, UnoEventType.START);
        assertThat(game.latestEvents().get(0).target()).isEqualTo(A);
        assertThat(game.latestEvents().get(1).actor()).isEqualTo(B);
    }

    @Test
    void R7_첫_카드가_REVERSE면_3명에서는_반대_방향으로_딜러부터_한다() {
        UnoGame game = game(List.of(A, B, C), THREE_HANDS, reverse(RED), filler(5));

        assertThat(game.direction()).isEqualTo(Direction.COUNTER_CLOCKWISE);
        assertThat(game.actor()).isEqualTo(C);
        assertThat(game.latestEvents()).extracting(UnoEvent::type).containsExactly(UnoEventType.REVERSE, UnoEventType.START);
    }

    @Test
    void R7_첫_카드가_REVERSE면_2명에서는_시작_사람이_차례를_잃고_방향은_그대로다() {
        UnoGame game = game(List.of(A, B), TWO_HANDS, reverse(RED), filler(5));

        assertThat(game.actor()).isEqualTo(B);
        assertThat(game.direction()).isEqualTo(Direction.CLOCKWISE);
        assertThat(game.latestEvents()).extracting(UnoEvent::type).containsExactly(UnoEventType.SKIP, UnoEventType.START);
        assertThat(game.latestEvents().get(0).target()).isEqualTo(A);
    }

    @Test
    void R7_첫_카드가_DRAW_TWO면_시작_사람이_2장을_뽑고_차례를_잃는다() {
        UnoGame game = game(List.of(A, B, C), THREE_HANDS, drawTwo(RED), filler(5));

        assertThat(game.cardCount(A)).isEqualTo(3);
        assertThat(game.actor()).isEqualTo(B);
        UnoEvent penalty = game.latestEvents().get(0);
        assertThat(penalty.type()).isEqualTo(UnoEventType.PENALTY);
        assertThat(penalty.target()).isEqualTo(A);
        assertThat(penalty.count()).isEqualTo(2);
        assertThat(penalty.reason()).isEqualTo(UnoEventReason.DRAW_TWO);
    }

    @Test
    void R7_첫_카드가_WILD면_시작_사람이_색을_고르고_현재_색은_비어_있다() {
        UnoGame game = game(List.of(A, B, C), THREE_HANDS, wild(0), filler(5));

        assertThat(game.actor()).isEqualTo(A);
        assertThat(game.stage()).isEqualTo(UnoStage.CHOOSE_COLOR);
        assertThat(game.currentColor()).isEmpty();
    }

    @Test
    void R7_첫_카드가_와일드_4면_더미에_다시_넣고_다른_카드가_나올_때까지_뒤집는다() {
        UnoGame game = game(List.of(A, B, C), THREE_HANDS, wildFour(0), List.of(wildFour(1), num(GREEN, 3), num(BLUE, 2)));

        assertThat(game.discardTop()).isEqualTo(num(GREEN, 3));
        assertThat(game.currentColor()).contains(GREEN);
        assertThat(game.drawPileSize()).isEqualTo(3);
        assertThat(game.latestEvents()).extracting(UnoEvent::type).containsExactly(
                UnoEventType.FIRST_CARD_REDRAWN, UnoEventType.FIRST_CARD_REDRAWN, UnoEventType.START);
        assertThat(game.latestEvents().get(0).card()).isEqualTo(wildFour(0));
    }

    @Test
    void 우노는_2명에서_5명까지_할_수_있다() {
        UnoRoundFactory factory = new UnoRoundFactory(StackedUnoShuffler.of(StandardUnoDeck.cards()), count -> 0);
        PlayerId e = new PlayerId(5L);
        PlayerId f = new PlayerId(6L);

        assertError(() -> UnoGame.start(List.of(A), factory), ErrorCode.UNO_INVALID_PLAYER_COUNT);
        assertError(() -> UnoGame.start(List.of(A, B, C, D, e, f), factory), ErrorCode.UNO_INVALID_PLAYER_COUNT);
    }
}
