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
import com.boardgame.game.GameAction;
import java.time.Clock;
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
    void R18_와일드_4를_내면_다음_사람이_바로_4장을_뽑고_차례를_잃는다() {
        UnoGame game = withAHand(List.of(wildFour(0), num(BLUE, 5), wild(0), num(GREEN, 1)));
        StageSeq before = game.stageSeq();

        four(game, A, GREEN);

        assertThat(game.cardCount(B)).isEqualTo(8);
        assertThat(game.actor()).isEqualTo(C);
        assertThat(game.stage()).isEqualTo(UnoStage.PLAY);
        assertThat(game.stageSeq()).isNotEqualTo(before);
        assertThat(game.currentColor()).contains(GREEN);
        assertThat(game.latestEvents()).extracting(UnoEvent::type).containsExactly(UnoEventType.PLAY, UnoEventType.PENALTY);
        UnoEvent penalty = game.latestEvents().get(1);
        assertThat(penalty.target()).isEqualTo(B);
        assertThat(penalty.count()).isEqualTo(4);
        assertThat(penalty.reason()).isEqualTo(UnoEventReason.WILD_DRAW_FOUR);
    }

    @Test
    void R11_현재_색_카드가_있어도_와일드_4를_언제든_낼_수_있다() {
        UnoGame game = withAHand(List.of(wildFour(0), num(RED, 2), num(GREEN, 1), num(BLUE, 1)));

        assertThat(game.playableFor(A)).contains(wildFour(0).id());
        four(game, A, GREEN);

        assertThat(game.cardCount(B)).isEqualTo(8);
        assertThat(game.actor()).isEqualTo(C);
    }

    @Test
    void R18_2명에서_와일드_4를_내면_낸_사람이_다시_한다() {
        UnoGame game = game(List.of(A, B), List.of(List.of(wildFour(0), num(RED, 2)), List.of(num(GREEN, 2), num(GREEN, 3))), FIRST, filler(10));
        StageSeq before = game.stageSeq();

        four(game, A, GREEN);

        assertThat(game.cardCount(B)).isEqualTo(6);
        assertThat(game.actor()).isEqualTo(A);
        assertThat(game.stage()).isEqualTo(UnoStage.PLAY);
        assertThat(game.stageSeq()).isNotEqualTo(before);
    }

    @Test
    void 도전과_받기_행동은_더_이상_없다() {
        UnoSession session = new UnoSession(List.of(A.value(), B.value()), UnoFixtures.factory(
                List.of(List.of(wildFour(0), num(RED, 2)), List.of(num(GREEN, 2), num(GREEN, 3))), FIRST, filler(10), 0), Clock.systemUTC());

        assertError(() -> session.act(B.value(), new GameAction("CHALLENGE", null, null)), ErrorCode.INVALID_INPUT);
        assertError(() -> session.act(B.value(), new GameAction("ACCEPT", null, null)), ErrorCode.INVALID_INPUT);
    }

    @Test
    void R25_한_장_남기는_와일드_4_뒤에도_잡기_창은_다음_행동까지_열려_있다() {
        UnoGame game = game(List.of(A, B, C), List.of(List.of(wildFour(0), num(RED, 2)), B_HAND, C_HAND), FIRST, filler(20));

        four(game, A, GREEN);

        assertThat(game.catchTarget()).contains(A);
        game.catchUno(B, A);

        assertThat(game.cardCount(A)).isEqualTo(3);
        assertThat(game.actor()).isEqualTo(C);
        assertThat(game.stage()).isEqualTo(UnoStage.PLAY);
    }
}
