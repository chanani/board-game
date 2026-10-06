package com.boardgame.uno;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static com.boardgame.uno.UnoColor.BLUE;
import static com.boardgame.uno.UnoColor.GREEN;
import static com.boardgame.uno.UnoColor.RED;
import static com.boardgame.uno.UnoFixtures.A;
import static com.boardgame.uno.UnoFixtures.B;
import static com.boardgame.uno.UnoFixtures.C;
import static com.boardgame.uno.UnoFixtures.D;
import static com.boardgame.uno.UnoFixtures.filler;
import static com.boardgame.uno.UnoFixtures.game;
import static com.boardgame.uno.UnoFixtures.num;
import static com.boardgame.uno.UnoFixtures.wild;
import static com.boardgame.uno.UnoFixtures.wildFour;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class UnoForfeitTest {

    private static final UnoCard FIRST = num(RED, 5);

    private static UnoGame threePlayers(List<UnoCard> aHand, List<UnoCard> drawPile) {
        return game(List.of(A, B, C), List.of(aHand, List.of(num(GREEN, 2), num(BLUE, 2)), List.of(num(GREEN, 4), num(BLUE, 4))), FIRST, drawPile);
    }

    private static UnoGame threePlayers() {
        return threePlayers(List.of(num(RED, 1), num(RED, 2)), filler(10));
    }

    @Test
    void R35_R39_차례가_아닌_사람이_기권하면_손패는_더미_맨_아래로_가고_단계는_그대로다() {
        UnoGame game = threePlayers();
        int pileBefore = game.drawPileSize();
        StageSeq before = game.stageSeq();

        game.forfeit(B);

        assertThat(game.drawPileSize()).isEqualTo(pileBefore + 2);
        assertThat(game.remaining()).containsExactly(A, C);
        assertThat(game.isRemaining(B)).isFalse();
        assertThat(game.actor()).isEqualTo(A);
        assertThat(game.stageSeq()).isEqualTo(before);
        assertThat(game.latestEvents()).isEmpty();
    }

    @Test
    void R36_차례인_사람이_기권하면_다음_사람이_PLAY를_시작한다() {
        UnoGame game = threePlayers();
        StageSeq before = game.stageSeq();

        game.forfeit(A);

        assertThat(game.actor()).isEqualTo(B);
        assertThat(game.stage()).isEqualTo(UnoStage.PLAY);
        assertThat(game.stageSeq()).isNotEqualTo(before);
    }

    @Test
    void R36_뽑은_카드를_고르던_중에_기권해도_다음_사람이_PLAY를_시작한다() {
        List<UnoCard> pile = new ArrayList<>(List.of(num(RED, 9)));
        pile.addAll(filler(10));
        UnoGame game = threePlayers(List.of(num(RED, 1), num(RED, 2)), pile);
        game.draw(A);

        game.forfeit(A);

        assertThat(game.actor()).isEqualTo(B);
        assertThat(game.stage()).isEqualTo(UnoStage.PLAY);
    }

    @Test
    void R36_첫_카드_색_고르기_중에_기권하면_기권자_손패로_색을_정하고_넘긴다() {
        UnoGame game = game(List.of(A, B, C), List.of(
                List.of(num(GREEN, 1), num(GREEN, 2)), List.of(num(BLUE, 1), num(BLUE, 2)), List.of(num(RED, 3), num(RED, 4))), wild(0), filler(10));

        game.forfeit(A);

        assertThat(game.currentColor()).contains(GREEN);
        assertThat(game.actor()).isEqualTo(B);
        assertThat(game.stage()).isEqualTo(UnoStage.PLAY);
        assertThat(game.latestEvents()).extracting(UnoEvent::type).containsExactly(UnoEventType.COLOR);
        assertThat(game.latestEvents().get(0).actor()).isEqualTo(A);
    }

    @Test
    void R37_와일드_4를_받은_사람이_기권하면_효과가_사라지고_그_다음_사람이_한다() {
        UnoGame game = threePlayers(List.of(wildFour(0), num(RED, 1)), filler(10));
        game.play(A, wildFour(0).id(), ChosenColor.of(GREEN));

        game.forfeit(B);

        assertThat(game.actor()).isEqualTo(C);
        assertThat(game.stage()).isEqualTo(UnoStage.PLAY);
        assertThat(game.pendingCharge()).isEmpty();
        assertThat(game.cardCount(A)).isEqualTo(1);
        assertThat(game.cardCount(C)).isEqualTo(2);
    }

    @Test
    void R37_와일드_4를_낸_사람이_기권하면_받는_사람이_벌칙_없이_정상_차례를_한다() {
        UnoGame game = threePlayers(List.of(wildFour(0), num(RED, 1)), filler(10));
        game.play(A, wildFour(0).id(), ChosenColor.of(GREEN));
        StageSeq before = game.stageSeq();

        game.forfeit(A);

        assertThat(game.actor()).isEqualTo(B);
        assertThat(game.stage()).isEqualTo(UnoStage.PLAY);
        assertThat(game.stageSeq()).isNotEqualTo(before);
        assertThat(game.cardCount(B)).isEqualTo(2);
        assertThat(game.pendingCharge()).isEmpty();
    }

    @Test
    void R35_잡기_대상이_기권하면_창이_닫힌다() {
        UnoGame game = threePlayers();
        game.play(A, num(RED, 1).id(), ChosenColor.none());

        game.forfeit(A);

        assertThat(game.catchTarget()).isEmpty();
    }

    @Test
    void R33_남은_사람이_1명이면_그_사람이_이기고_점수는_없다() {
        UnoGame game = game(List.of(A, B), List.of(List.of(num(RED, 1)), List.of(num(GREEN, 1))), FIRST, filler(5));

        game.forfeit(B);

        assertThat(game.isFinished()).isTrue();
        assertThat(game.result()).hasValueSatisfying(result -> {
            assertThat(result.reason()).isEqualTo(UnoEndReason.FORFEIT);
            assertThat(result.winner()).isEqualTo(A);
            assertThat(result.points()).isEqualTo(UnoPoints.ZERO);
        });
        assertThat(game.latestEvents()).extracting(UnoEvent::type).containsExactly(UnoEventType.GAME_END);
        assertThat(game.latestEvents().get(0).count()).isNull();
        assertThat(game.latestEvents().get(0).reason()).isEqualTo(UnoEventReason.FORFEIT);
    }

    @Test
    void 참가자가_아니면_기권할_수_없다() {
        UnoGame game = threePlayers();

        assertError(() -> game.forfeit(D), ErrorCode.NOT_A_PLAYER);
        game.forfeit(B);
        assertError(() -> game.forfeit(B), ErrorCode.NOT_A_PLAYER);
    }

    @Test
    void R35_잡기_대상이_기권하면_잡을_수_없고_차례는_다음_사람이_이어서_한다() {
        UnoGame game = threePlayers();
        game.play(A, num(RED, 1).id(), ChosenColor.none());
        assertThat(game.canCatch(C)).isTrue();

        game.forfeit(A);

        assertThat(game.canCatch(B)).isFalse();
        assertThat(game.canCatch(C)).isFalse();
        assertThat(game.actor()).isEqualTo(B);
        assertThat(game.remaining()).containsExactly(B, C);
    }

    @Test
    void R35_기권한_사람은_차례_순서에서_건너뛴다() {
        UnoGame game = threePlayers();
        game.forfeit(B);

        game.play(A, num(RED, 1).id(), ChosenColor.none());

        assertThat(game.actor()).isEqualTo(C);
    }
}
