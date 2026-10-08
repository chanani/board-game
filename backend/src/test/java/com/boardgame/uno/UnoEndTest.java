package com.boardgame.uno;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static com.boardgame.uno.UnoColor.BLUE;
import static com.boardgame.uno.UnoColor.GREEN;
import static com.boardgame.uno.UnoColor.RED;
import static com.boardgame.uno.UnoFixtures.A;
import static com.boardgame.uno.UnoFixtures.B;
import static com.boardgame.uno.UnoFixtures.C;
import static com.boardgame.uno.UnoFixtures.drawTwo;
import static com.boardgame.uno.UnoFixtures.filler;
import static com.boardgame.uno.UnoFixtures.game;
import static com.boardgame.uno.UnoFixtures.num;
import static com.boardgame.uno.UnoFixtures.skip;
import static com.boardgame.uno.UnoFixtures.wild;
import static com.boardgame.uno.UnoFixtures.wildFour;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import java.util.List;
import org.junit.jupiter.api.Test;

class UnoEndTest {

    private static final UnoCard FIRST = num(RED, 5);
    private static final List<UnoCard> B_HAND = List.of(num(BLUE, 9), wild(0));
    private static final List<UnoCard> C_HAND = List.of(num(GREEN, 3), drawTwo(BLUE));

    // A가 빨강 1을 낸 뒤 B·C가 한 장씩 뽑고 넘겨(노랑 0, 노랑 1) 다시 A 차례가 된다. A의 마지막 카드는 last.
    private static UnoGame lastCardReady(UnoCard last) {
        UnoGame game = game(List.of(A, B, C), List.of(List.of(num(RED, 3), last), B_HAND, C_HAND), FIRST, filler(20));
        game.play(A, num(RED, 3).id(), ChosenColor.none());
        game.draw(B);
        game.draw(C);
        return game;
    }

    @Test
    void R29_R31_손패를_먼저_비우면_이기고_남은_사람들의_손패_점수를_얻는다() {
        UnoGame game = lastCardReady(num(RED, 2));

        game.play(A, num(RED, 2).id(), ChosenColor.none());

        assertThat(game.isFinished()).isTrue();
        assertThat(game.result()).hasValueSatisfying(result -> {
            assertThat(result.reason()).isEqualTo(UnoEndReason.EMPTY_HAND);
            assertThat(result.winner()).isEqualTo(A);
            assertThat(result.points()).isEqualTo(new UnoPoints(83));
        });
        assertThat(game.latestEvents()).extracting(UnoEvent::type).containsExactly(UnoEventType.PLAY, UnoEventType.GAME_END);
        UnoEvent end = game.latestEvents().get(1);
        assertThat(end.actor()).isEqualTo(A);
        assertThat(end.count()).isEqualTo(83);
        assertThat(end.reason()).isEqualTo(UnoEventReason.EMPTY_HAND);
    }

    @Test
    void R29_마지막_DRAW_TWO면_다음_사람이_2장을_뽑고_그_카드도_점수에_들어간다() {
        UnoGame game = lastCardReady(drawTwo(RED));

        game.play(A, drawTwo(RED).id(), ChosenColor.none());

        assertThat(game.cardCount(B)).isEqualTo(5);
        assertThat(game.result()).hasValueSatisfying(result -> assertThat(result.points()).isEqualTo(new UnoPoints(86)));
        assertThat(game.latestEvents()).extracting(UnoEvent::type).containsExactly(UnoEventType.PLAY, UnoEventType.PENALTY, UnoEventType.GAME_END);
    }

    @Test
    void R30_마지막_와일드_4는_받는_사람이_4장을_뽑고_끝난다() {
        UnoGame game = lastCardReady(wildFour(0));

        game.play(A, wildFour(0).id(), ChosenColor.of(GREEN));

        assertThat(game.isFinished()).isTrue();
        assertThat(game.cardCount(B)).isEqualTo(7);
        assertThat(game.latestEvents()).extracting(UnoEvent::type).containsExactly(UnoEventType.PLAY, UnoEventType.PENALTY, UnoEventType.GAME_END);
        assertThat(game.latestEvents().get(1).reason()).isEqualTo(UnoEventReason.WILD_DRAW_FOUR);
    }

    @Test
    void R29_마지막_SKIP은_효과_없이_끝난다() {
        UnoGame game = lastCardReady(skip(RED));

        game.play(A, skip(RED).id(), ChosenColor.none());

        assertThat(game.latestEvents()).extracting(UnoEvent::type).containsExactly(UnoEventType.PLAY, UnoEventType.GAME_END);
    }

    @Test
    void R28_끝난_뒤에는_잡기도_행동도_없다() {
        UnoGame game = lastCardReady(num(RED, 2));
        game.play(A, num(RED, 2).id(), ChosenColor.none());

        assertThat(game.catchTarget()).isEmpty();
        assertError(() -> game.catchUno(B, A), ErrorCode.GAME_ALREADY_OVER);
        assertError(() -> game.draw(B), ErrorCode.GAME_ALREADY_OVER);
        assertError(() -> game.forfeit(B), ErrorCode.GAME_ALREADY_OVER);
        assertError(game::autoAct, ErrorCode.GAME_ALREADY_OVER);
    }

    @Test
    void R7_첫_카드_WILD의_색을_고르면_같은_사람이_이어서_한다() {
        UnoGame game = game(List.of(A, B), List.of(List.of(num(GREEN, 1), num(BLUE, 1)), List.of(num(GREEN, 2), num(BLUE, 2))), wild(0), filler(10));
        StageSeq before = game.stageSeq();

        assertError(() -> game.chooseColor(B, ChosenColor.of(GREEN)), ErrorCode.NOT_YOUR_TURN);
        assertError(() -> game.chooseColor(A, ChosenColor.none()), ErrorCode.UNO_COLOR_REQUIRED);
        assertError(() -> game.chooseColor(A, new ChosenColor("PURPLE")), ErrorCode.UNO_INVALID_COLOR);
        assertError(() -> game.draw(A), ErrorCode.INVALID_PHASE);
        game.chooseColor(A, ChosenColor.of(GREEN));

        assertThat(game.currentColor()).contains(GREEN);
        assertThat(game.actor()).isEqualTo(A);
        assertThat(game.stage()).isEqualTo(UnoStage.PLAY);
        assertThat(game.stageSeq()).isNotEqualTo(before);
        assertThat(game.latestEvents()).extracting(UnoEvent::type).containsExactly(UnoEventType.COLOR);
        assertError(() -> game.chooseColor(A, ChosenColor.of(RED)), ErrorCode.INVALID_PHASE);
    }

    @Test
    void D12_마지막_와일드_4는_다음_사람에게_4장을_주고_점수까지_정산된다() {
        UnoGame game = lastCardReady(wildFour(0));
        StageSeq before = game.stageSeq();

        game.play(A, wildFour(0).id(), ChosenColor.of(GREEN));

        assertThat(game.stageSeq()).isEqualTo(before);
        assertThat(game.latestEvents()).extracting(UnoEvent::type).contains(UnoEventType.PENALTY);
        assertThat(game.result()).hasValueSatisfying(result -> assertThat(result.points()).isEqualTo(game.pointsOf(B).plus(game.pointsOf(C))));
    }
}
