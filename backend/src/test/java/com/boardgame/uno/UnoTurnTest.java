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
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class UnoTurnTest {

    private static final UnoCard FIRST = num(RED, 5);
    private static final List<UnoCard> A_HAND = List.of(num(RED, 2), num(BLUE, 5), skip(RED), wild(0));
    private static final List<UnoCard> B_HAND = List.of(num(RED, 3), num(GREEN, 8), reverse(RED), drawTwo(RED));
    private static final List<UnoCard> C_HAND = List.of(num(RED, 4), num(GREEN, 9), skip(RED, 1), num(BLUE, 3));

    private static UnoGame threePlayers(List<UnoCard> drawPile) {
        return game(List.of(A, B, C), List.of(A_HAND, B_HAND, C_HAND), FIRST, drawPile);
    }

    private static UnoGame threePlayers() {
        return threePlayers(filler(10));
    }

    private static List<UnoCard> pile(UnoCard top) {
        List<UnoCard> cards = new ArrayList<>();
        cards.add(top);
        cards.addAll(filler(10));
        return cards;
    }

    private static void play(UnoGame game, PlayerId player, UnoCard card) {
        game.play(player, card.id(), ChosenColor.none());
    }

    @Test
    void R8_현재_색과_같은_카드를_내면_다음_사람_차례다() {
        UnoGame game = threePlayers();

        play(game, A, num(RED, 2));

        assertThat(game.discardTop()).isEqualTo(num(RED, 2));
        assertThat(game.currentColor()).contains(RED);
        assertThat(game.actor()).isEqualTo(B);
        assertThat(game.stage()).isEqualTo(UnoStage.PLAY);
        assertThat(game.cardCount(A)).isEqualTo(3);
        assertThat(game.latestEvents()).extracting(UnoEvent::type).containsExactly(UnoEventType.PLAY);
        UnoEvent event = game.latestEvents().get(0);
        assertThat(event.actor()).isEqualTo(A);
        assertThat(event.card()).isEqualTo(num(RED, 2));
        assertThat(event.color()).isNull();
    }

    @Test
    void R8_숫자가_같으면_다른_색도_낼_수_있고_현재_색이_바뀐다() {
        UnoGame game = threePlayers();

        play(game, A, num(BLUE, 5));

        assertThat(game.currentColor()).contains(BLUE);
    }

    @Test
    void R8_낼_수_없는_카드는_거절한다() {
        UnoGame game = game(List.of(A, B), List.of(List.of(num(BLUE, 3)), List.of(num(GREEN, 1))), FIRST, filler(5));

        assertError(() -> play(game, A, num(BLUE, 3)), ErrorCode.UNO_CARD_NOT_PLAYABLE);
    }

    @Test
    void 손에_없는_카드는_거절한다() {
        UnoGame game = threePlayers();

        assertError(() -> play(game, A, num(RED, 3)), ErrorCode.UNO_CARD_NOT_IN_HAND);
    }

    @Test
    void 남의_차례에는_낼_수_없다() {
        UnoGame game = threePlayers();

        assertError(() -> play(game, B, num(RED, 3)), ErrorCode.NOT_YOUR_TURN);
    }

    @Test
    void 참가자가_아니면_거절한다() {
        UnoGame game = threePlayers();

        assertError(() -> game.draw(D), ErrorCode.NOT_A_PLAYER);
    }

    @Test
    void R10_와일드는_색과_함께_내야_한다() {
        UnoGame game = threePlayers();

        assertError(() -> game.play(A, wild(0).id(), ChosenColor.none()), ErrorCode.UNO_COLOR_REQUIRED);
        assertError(() -> game.play(A, wild(0).id(), new ChosenColor("PURPLE")), ErrorCode.UNO_INVALID_COLOR);
        game.play(A, wild(0).id(), ChosenColor.of(GREEN));

        assertThat(game.currentColor()).contains(GREEN);
        assertThat(game.latestEvents().get(0).color()).isEqualTo(GREEN);
    }

    @Test
    void R10_와일드가_아니면_보낸_색은_무시한다() {
        UnoGame game = threePlayers();

        game.play(A, num(RED, 2).id(), new ChosenColor("PURPLE"));

        assertThat(game.currentColor()).contains(RED);
    }

    @Test
    void R9_한_차례에_한_장만_낸다() {
        UnoGame game = threePlayers();
        play(game, A, num(RED, 2));

        assertError(() -> play(game, A, skip(RED)), ErrorCode.NOT_YOUR_TURN);
    }

    @Test
    void R12_낼_수_있어도_뽑을_수_있고_뽑은_카드를_낼_수_있으면_DRAWN() {
        UnoGame game = threePlayers(pile(num(RED, 9)));
        StageSeq before = game.stageSeq();

        game.draw(A);

        assertThat(game.stage()).isEqualTo(UnoStage.DRAWN);
        assertThat(game.actor()).isEqualTo(A);
        assertThat(game.cardCount(A)).isEqualTo(5);
        assertThat(game.stageSeq()).isNotEqualTo(before);
        assertThat(game.latestEvents()).extracting(UnoEvent::type).containsExactly(UnoEventType.DRAW);
        assertThat(game.latestEvents().get(0).count()).isEqualTo(1);
        assertThat(game.latestEvents().get(0).card()).isNull();
    }

    @Test
    void R12_DRAWN에서는_방금_뽑은_카드만_낼_수_있다() {
        UnoGame game = threePlayers(pile(num(RED, 9)));
        game.draw(A);

        assertError(() -> play(game, A, num(RED, 2)), ErrorCode.UNO_ONLY_DRAWN_CARD);
        play(game, A, num(RED, 9));

        assertThat(game.discardTop()).isEqualTo(num(RED, 9));
        assertThat(game.actor()).isEqualTo(B);
    }

    @Test
    void R12_뽑은_카드를_갖고_넘긴다() {
        UnoGame game = threePlayers(pile(num(RED, 9)));
        game.draw(A);

        game.keep(A);

        assertThat(game.actor()).isEqualTo(B);
        assertThat(game.cardCount(A)).isEqualTo(5);
        assertThat(game.latestEvents()).extracting(UnoEvent::type).containsExactly(UnoEventType.PASS);
        assertThat(game.latestEvents().get(0).reason()).isEqualTo(UnoEventReason.KEEP);
    }

    @Test
    void R12_뽑은_카드를_낼_수_없으면_바로_넘어간다() {
        UnoGame game = threePlayers(pile(num(BLUE, 9)));

        game.draw(A);

        assertThat(game.actor()).isEqualTo(B);
        assertThat(game.stage()).isEqualTo(UnoStage.PLAY);
        assertThat(game.latestEvents()).extracting(UnoEvent::type).containsExactly(UnoEventType.DRAW, UnoEventType.PASS);
        assertThat(game.latestEvents().get(1).reason()).isEqualTo(UnoEventReason.NO_PLAYABLE);
    }

    @Test
    void R12_한_차례에_뽑기는_한_번이다() {
        UnoGame game = threePlayers(pile(num(RED, 9)));
        game.draw(A);

        assertError(() -> game.draw(A), ErrorCode.INVALID_PHASE);
    }

    @Test
    void R13_PLAY_단계에서는_그냥_넘길_수_없다() {
        UnoGame game = threePlayers();

        assertError(() -> game.keep(A), ErrorCode.INVALID_PHASE);
    }

    @Test
    void R15_SKIP이면_다음_사람이_차례를_잃는다() {
        UnoGame game = threePlayers();

        play(game, A, skip(RED));

        assertThat(game.actor()).isEqualTo(C);
        assertThat(game.latestEvents()).extracting(UnoEvent::type).containsExactly(UnoEventType.PLAY, UnoEventType.SKIP);
        assertThat(game.latestEvents().get(1).target()).isEqualTo(B);
    }

    @Test
    void R16_REVERSE는_3명이면_방향을_바꾼다() {
        UnoGame game = threePlayers();
        play(game, A, num(RED, 2));

        play(game, B, reverse(RED));

        assertThat(game.direction()).isEqualTo(Direction.COUNTER_CLOCKWISE);
        assertThat(game.actor()).isEqualTo(A);
        assertThat(game.latestEvents()).extracting(UnoEvent::type).containsExactly(UnoEventType.PLAY, UnoEventType.REVERSE);
        assertThat(game.latestEvents().get(1).actor()).isEqualTo(B);
        play(game, A, skip(RED));
        assertThat(game.actor()).isEqualTo(B);
    }

    @Test
    void R16_REVERSE는_2명이면_건너뛰기와_같다() {
        UnoGame game = game(List.of(A, B), List.of(List.of(reverse(RED), num(RED, 2)), List.of(num(GREEN, 1), num(GREEN, 2))), FIRST, filler(5));
        StageSeq before = game.stageSeq();

        play(game, A, reverse(RED));

        assertThat(game.actor()).isEqualTo(A);
        assertThat(game.direction()).isEqualTo(Direction.CLOCKWISE);
        assertThat(game.stageSeq()).isNotEqualTo(before);
        assertThat(game.latestEvents()).extracting(UnoEvent::type).containsExactly(UnoEventType.PLAY, UnoEventType.SKIP);
        assertThat(game.latestEvents().get(1).target()).isEqualTo(B);
    }

    @Test
    void 방향이_반대일_때_SKIP은_반대쪽_다음_사람을_건너뛴다() {
        UnoGame game = threePlayers();
        play(game, A, num(RED, 2));
        play(game, B, reverse(RED));

        play(game, A, skip(RED));

        assertThat(game.latestEvents().get(1).target()).isEqualTo(C);
        assertThat(game.actor()).isEqualTo(B);
    }

    @Test
    void R17_DRAW_TWO면_다음_사람이_2장을_뽑고_차례를_잃는다() {
        UnoGame game = threePlayers();
        play(game, A, num(RED, 2));

        play(game, B, drawTwo(RED));

        assertThat(game.cardCount(C)).isEqualTo(6);
        assertThat(game.actor()).isEqualTo(A);
        assertThat(game.latestEvents()).extracting(UnoEvent::type).containsExactly(UnoEventType.PLAY, UnoEventType.PENALTY);
        UnoEvent penalty = game.latestEvents().get(1);
        assertThat(penalty.target()).isEqualTo(C);
        assertThat(penalty.count()).isEqualTo(2);
        assertThat(penalty.reason()).isEqualTo(UnoEventReason.DRAW_TWO);
    }

    @Test
    void R17_DRAW_TWO_위에_DRAW_TWO를_겹칠_수_없다_다음_사람은_이미_건너뛰었다() {
        UnoGame game = threePlayers();
        play(game, A, num(RED, 2));
        play(game, B, drawTwo(RED));

        assertError(() -> play(game, C, skip(RED, 1)), ErrorCode.NOT_YOUR_TURN);
    }

    @Test
    void R14_뽑을_더미가_비면_버린_카드를_섞어_다시_만든다() {
        UnoGame game = game(List.of(A, B), List.of(List.of(num(RED, 1), num(RED, 2)), List.of(num(GREEN, 1), num(GREEN, 2))), FIRST, List.of());
        play(game, A, num(RED, 1));

        game.draw(B);

        assertThat(game.latestEvents()).extracting(UnoEvent::type).startsWith(UnoEventType.RESHUFFLE, UnoEventType.DRAW);
        assertThat(game.latestEvents().get(0).count()).isEqualTo(1);
        assertThat(game.cardCount(B)).isEqualTo(3);
        assertThat(game.discardSize()).isEqualTo(1);
        assertThat(game.discardTop()).isEqualTo(num(RED, 1));
    }

    @Test
    void R14_다시_만들어도_모자라면_있는_만큼만_뽑는다() {
        UnoGame game = game(List.of(A, B), List.of(List.of(drawTwo(RED), num(RED, 2)), List.of(num(GREEN, 1), num(GREEN, 2))), FIRST, List.of());

        play(game, A, drawTwo(RED));

        assertThat(game.latestEvents()).extracting(UnoEvent::type).containsExactly(UnoEventType.PLAY, UnoEventType.RESHUFFLE, UnoEventType.PENALTY);
        assertThat(game.latestEvents().get(2).count()).isEqualTo(1);
        assertThat(game.cardCount(B)).isEqualTo(3);
    }

    @Test
    void R14_한_장도_뽑지_못하면_차례를_넘긴다() {
        UnoGame game = game(List.of(A, B), List.of(List.of(num(BLUE, 1)), List.of(num(GREEN, 1))), FIRST, List.of());

        game.draw(A);

        assertThat(game.actor()).isEqualTo(B);
        assertThat(game.latestEvents()).extracting(UnoEvent::type).containsExactly(UnoEventType.PASS);
        assertThat(game.latestEvents().get(0).reason()).isEqualTo(UnoEventReason.EMPTY_PILE);
    }

    @Test
    void 실패한_행동은_이전_이벤트_기록을_지우지_않는다() {
        UnoGame game = threePlayers();
        play(game, A, num(RED, 2));

        assertError(() -> play(game, B, num(GREEN, 8)), ErrorCode.UNO_CARD_NOT_PLAYABLE);

        assertThat(game.latestEvents()).extracting(UnoEvent::type).containsExactly(UnoEventType.PLAY);
    }
}
