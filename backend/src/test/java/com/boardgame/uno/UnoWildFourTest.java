package com.boardgame.uno;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static com.boardgame.uno.UnoColor.BLUE;
import static com.boardgame.uno.UnoColor.GREEN;
import static com.boardgame.uno.UnoColor.RED;
import static com.boardgame.uno.UnoFixtures.A;
import static com.boardgame.uno.UnoFixtures.B;
import static com.boardgame.uno.UnoFixtures.C;
import static com.boardgame.uno.UnoFixtures.filler;
import static com.boardgame.uno.UnoFixtures.game;
import static com.boardgame.uno.UnoFixtures.num;
import static com.boardgame.uno.UnoFixtures.wild;
import static com.boardgame.uno.UnoFixtures.wildFour;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import java.util.List;
import org.junit.jupiter.api.Test;

class UnoWildFourTest {

    private static final UnoCard FIRST = num(RED, 5);
    private static final List<UnoCard> B_HAND = List.of(num(GREEN, 2), num(GREEN, 3), wildFour(1), num(BLUE, 8));
    private static final List<UnoCard> C_HAND = List.of(num(GREEN, 4), num(GREEN, 6), num(BLUE, 9), num(BLUE, 7));

    private static UnoGame withAHand(List<UnoCard> aHand) {
        return game(List.of(A, B, C), List.of(aHand, B_HAND, C_HAND), FIRST, filler(20));
    }

    private static void four(UnoGame game, PlayerId player, UnoColor color) {
        game.play(player, wildFour(0).id(), ChosenColor.of(color));
    }

    @Test
    void R18_와일드_4를_내면_다음_사람의_도전_단계다() {
        UnoGame game = withAHand(List.of(wildFour(0), num(BLUE, 5), wild(0), num(GREEN, 1)));

        four(game, A, GREEN);

        assertThat(game.actor()).isEqualTo(B);
        assertThat(game.stage()).isEqualTo(UnoStage.CHALLENGE);
        assertThat(game.currentColor()).contains(GREEN);
        assertThat(game.pendingCharge()).hasValueSatisfying(charge -> assertThat(charge.by()).isEqualTo(A));
    }

    @Test
    void R11_현재_색_카드가_없으면_같은_숫자나_다른_와일드가_있어도_합법이다() {
        UnoGame game = withAHand(List.of(wildFour(0), num(BLUE, 5), wild(0), num(GREEN, 1)));
        four(game, A, GREEN);

        assertThat(game.pendingCharge()).hasValueSatisfying(charge -> assertThat(charge.legal()).isTrue());
    }

    @Test
    void R11_현재_색_카드가_있어도_서버는_받아_준다() {
        UnoGame game = withAHand(List.of(wildFour(0), num(RED, 2), num(GREEN, 1), num(BLUE, 1)));

        four(game, A, GREEN);

        assertThat(game.stage()).isEqualTo(UnoStage.CHALLENGE);
        assertThat(game.pendingCharge()).hasValueSatisfying(charge -> assertThat(charge.legal()).isFalse());
    }

    @Test
    void R11_합법_여부는_낼_때의_현재_색으로_정한다() {
        UnoGame game = withAHand(List.of(wildFour(0), num(BLUE, 2), num(BLUE, 3), num(GREEN, 1)));

        four(game, A, BLUE);
        game.challenge(B);

        assertThat(game.latestEvents().get(0).reason()).isEqualTo(UnoEventReason.INNOCENT);
    }

    @Test
    void R19_4장을_받으면_받는_사람이_4장을_뽑고_차례를_잃는다() {
        UnoGame game = withAHand(List.of(wildFour(0), num(BLUE, 2), num(BLUE, 3), num(GREEN, 1)));
        four(game, A, BLUE);

        game.accept(B);

        assertThat(game.cardCount(B)).isEqualTo(8);
        assertThat(game.actor()).isEqualTo(C);
        assertThat(game.stage()).isEqualTo(UnoStage.PLAY);
        assertThat(game.currentColor()).contains(BLUE);
        assertThat(game.pendingCharge()).isEmpty();
        assertThat(game.latestEvents()).extracting(UnoEvent::type).containsExactly(UnoEventType.PENALTY);
        UnoEvent penalty = game.latestEvents().get(0);
        assertThat(penalty.target()).isEqualTo(B);
        assertThat(penalty.count()).isEqualTo(4);
        assertThat(penalty.reason()).isEqualTo(UnoEventReason.WILD_DRAW_FOUR);
    }

    @Test
    void R20_도전_성공이면_낸_사람이_4장을_뽑고_받는_사람이_이어서_한다() {
        UnoGame game = withAHand(List.of(wildFour(0), num(RED, 2), num(GREEN, 1), num(BLUE, 1)));
        four(game, A, GREEN);
        StageSeq before = game.stageSeq();

        game.challenge(B);

        assertThat(game.cardCount(A)).isEqualTo(7);
        assertThat(game.cardCount(B)).isEqualTo(4);
        assertThat(game.actor()).isEqualTo(B);
        assertThat(game.stage()).isEqualTo(UnoStage.PLAY);
        assertThat(game.stageSeq()).isNotEqualTo(before);
        assertThat(game.discardTop()).isEqualTo(wildFour(0));
        assertThat(game.currentColor()).contains(GREEN);
        assertThat(game.latestEvents()).extracting(UnoEvent::type).containsExactly(UnoEventType.CHALLENGE, UnoEventType.PENALTY);
        UnoEvent challenge = game.latestEvents().get(0);
        assertThat(challenge.actor()).isEqualTo(B);
        assertThat(challenge.target()).isEqualTo(A);
        assertThat(challenge.reason()).isEqualTo(UnoEventReason.GUILTY);
        assertThat(game.latestEvents().get(1).reason()).isEqualTo(UnoEventReason.CHALLENGE_GUILTY);
    }

    @Test
    void R21_도전_실패면_받는_사람이_6장을_뽑고_차례를_잃는다() {
        UnoGame game = withAHand(List.of(wildFour(0), num(BLUE, 5), wild(0), num(GREEN, 1)));
        four(game, A, GREEN);

        game.challenge(B);

        assertThat(game.cardCount(B)).isEqualTo(10);
        assertThat(game.actor()).isEqualTo(C);
        assertThat(game.latestEvents()).extracting(UnoEvent::type).containsExactly(UnoEventType.CHALLENGE, UnoEventType.PENALTY);
        assertThat(game.latestEvents().get(0).reason()).isEqualTo(UnoEventReason.INNOCENT);
        assertThat(game.latestEvents().get(1).count()).isEqualTo(6);
        assertThat(game.latestEvents().get(1).reason()).isEqualTo(UnoEventReason.CHALLENGE_FAILED);
    }

    @Test
    void R22_도전_공개는_도전자에게만_보이고_다음_상태_변화에_지워진다() {
        UnoGame game = withAHand(List.of(wildFour(0), num(RED, 2), num(GREEN, 1), num(BLUE, 1)));
        four(game, A, GREEN);

        game.challenge(B);

        assertThat(game.revealFor(B)).hasValueSatisfying(reveal -> {
            assertThat(reveal.charged()).isEqualTo(A);
            assertThat(reveal.guilty()).isTrue();
            assertThat(reveal.cards()).containsExactly(num(RED, 2), num(GREEN, 1), num(BLUE, 1));
        });
        assertThat(game.revealFor(A)).isEmpty();
        assertThat(game.revealFor(C)).isEmpty();

        game.play(B, num(GREEN, 2).id(), ChosenColor.none());

        assertThat(game.revealFor(B)).isEmpty();
    }

    @Test
    void R22_실패한_행동은_공개를_지우지_않는다() {
        UnoGame game = withAHand(List.of(wildFour(0), num(RED, 2), num(GREEN, 1), num(BLUE, 1)));
        four(game, A, GREEN);
        game.challenge(B);

        assertError(() -> game.draw(C), ErrorCode.NOT_YOUR_TURN);

        assertThat(game.revealFor(B)).isPresent();
    }

    @Test
    void CHALLENGE_단계에서는_도전하거나_받기만_할_수_있다() {
        UnoGame game = withAHand(List.of(wildFour(0), num(RED, 2), num(GREEN, 1), num(BLUE, 1)));
        four(game, A, GREEN);

        assertError(() -> game.play(B, num(GREEN, 2).id(), ChosenColor.none()), ErrorCode.INVALID_PHASE);
        assertError(() -> game.draw(B), ErrorCode.INVALID_PHASE);
        assertError(() -> game.challenge(C), ErrorCode.NOT_YOUR_TURN);
        assertError(() -> game.accept(A), ErrorCode.NOT_YOUR_TURN);
    }

    @Test
    void R9_와일드_4_위에_와일드_4를_겹쳐_낼_수_없다() {
        UnoGame game = withAHand(List.of(wildFour(0), num(RED, 2), num(GREEN, 1), num(BLUE, 1)));
        four(game, A, GREEN);

        assertError(() -> game.play(B, wildFour(1).id(), ChosenColor.of(RED)), ErrorCode.INVALID_PHASE);
    }

    @Test
    void PLAY_단계에서는_도전할_수_없다() {
        UnoGame game = withAHand(List.of(wildFour(0), num(RED, 2), num(GREEN, 1), num(BLUE, 1)));

        assertError(() -> game.challenge(A), ErrorCode.INVALID_PHASE);
        assertError(() -> game.accept(A), ErrorCode.INVALID_PHASE);
    }

    @Test
    void R19_2명에서_4장을_받으면_낸_사람이_다시_한다() {
        UnoGame game = game(List.of(A, B), List.of(List.of(wildFour(0), num(RED, 2)), List.of(num(GREEN, 2), num(GREEN, 3))), FIRST, filler(10));
        four(game, A, GREEN);
        StageSeq before = game.stageSeq();

        game.accept(B);

        assertThat(game.actor()).isEqualTo(A);
        assertThat(game.stage()).isEqualTo(UnoStage.PLAY);
        assertThat(game.stageSeq()).isNotEqualTo(before);
    }
}
