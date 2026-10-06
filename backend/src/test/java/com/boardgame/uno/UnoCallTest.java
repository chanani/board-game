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
import static com.boardgame.uno.UnoFixtures.skip;
import static com.boardgame.uno.UnoFixtures.wildFour;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class UnoCallTest {

    private static final UnoCard FIRST = num(RED, 5);
    private static final List<List<UnoCard>> HANDS = List.of(
            List.of(num(RED, 1), num(RED, 2)),
            List.of(num(RED, 3), num(BLUE, 8)),
            List.of(num(RED, 4), num(BLUE, 9)));

    private static UnoGame threePlayers() {
        return game(List.of(A, B, C), HANDS, FIRST, filler(20));
    }

    private static UnoGame threePlayersDrawing(UnoCard top) {
        List<UnoCard> pile = new ArrayList<>();
        pile.add(top);
        pile.addAll(filler(20));
        return game(List.of(A, B, C), HANDS, FIRST, pile);
    }

    private static void play(UnoGame game, PlayerId player, UnoCard card) {
        game.play(player, card.id(), ChosenColor.none());
    }

    @Test
    void R23_2장일_때_외치고_내면_우노_선언이_된다() {
        UnoGame game = threePlayers();
        StageSeq before = game.stageSeq();

        game.callUno(A);

        assertThat(game.latestEvents()).extracting(UnoEvent::type).containsExactly(UnoEventType.UNO_CALL);
        assertThat(game.latestEvents().get(0).actor()).isEqualTo(A);
        assertThat(game.stageSeq()).isEqualTo(before);
        assertThat(game.actor()).isEqualTo(A);
        assertThat(game.canCallUno(A)).isFalse();
        play(game, A, num(RED, 1));
        assertThat(game.isDeclared(A)).isTrue();
        assertThat(game.catchTarget()).isEmpty();
    }

    @Test
    void R23_내_차례에_2장일_때만_외칠_수_있다() {
        UnoGame game = threePlayers();

        assertThat(game.canCallUno(A)).isTrue();
        assertThat(game.canCallUno(B)).isFalse();
        assertError(() -> game.callUno(B), ErrorCode.NOT_YOUR_TURN);
    }

    @Test
    void R23_2장이_아니면_외칠_수_없다() {
        UnoGame game = threePlayersDrawing(num(RED, 9));
        game.draw(A);

        assertThat(game.canCallUno(A)).isFalse();
        assertError(() -> game.callUno(A), ErrorCode.UNO_CALL_NOT_ALLOWED);
    }

    @Test
    void R23_같은_차례에_두_번_외칠_수_없다() {
        UnoGame game = threePlayers();
        game.callUno(A);

        assertError(() -> game.callUno(A), ErrorCode.UNO_CALL_NOT_ALLOWED);
    }

    @Test
    void R23_외친_상태는_차례가_끝나면_사라진다() {
        UnoGame game = threePlayersDrawing(num(RED, 9));
        game.callUno(A);
        game.draw(A);
        play(game, A, num(RED, 9));
        assertThat(game.isDeclared(A)).isFalse();
        play(game, B, num(RED, 3));
        play(game, C, num(RED, 4));

        play(game, A, num(RED, 1));

        assertThat(game.catchTarget()).contains(A);
    }

    @Test
    void R25_외치지_않고_1장이_되면_잡기_창이_열린다() {
        UnoGame game = threePlayers();

        play(game, A, num(RED, 1));

        assertThat(game.catchTarget()).contains(A);
        assertThat(game.canCatch(B)).isTrue();
        assertThat(game.canCatch(C)).isTrue();
        assertThat(game.canCatch(A)).isFalse();
        assertThat(game.canCatch(D)).isFalse();
        assertThat(game.canCallUno(A)).isTrue();
    }

    @Test
    void R26_잡으면_대상이_2장을_뽑고_창이_닫히며_차례는_그대로다() {
        UnoGame game = threePlayers();
        play(game, A, num(RED, 1));
        StageSeq before = game.stageSeq();

        game.catchUno(C, A);

        assertThat(game.cardCount(A)).isEqualTo(3);
        assertThat(game.catchTarget()).isEmpty();
        assertThat(game.actor()).isEqualTo(B);
        assertThat(game.stageSeq()).isEqualTo(before);
        assertThat(game.latestEvents()).extracting(UnoEvent::type).containsExactly(UnoEventType.UNO_CAUGHT, UnoEventType.PENALTY);
        UnoEvent caught = game.latestEvents().get(0);
        assertThat(caught.actor()).isEqualTo(C);
        assertThat(caught.target()).isEqualTo(A);
        UnoEvent penalty = game.latestEvents().get(1);
        assertThat(penalty.target()).isEqualTo(A);
        assertThat(penalty.count()).isEqualTo(2);
        assertThat(penalty.reason()).isEqualTo(UnoEventReason.UNO_CAUGHT);
    }

    @Test
    void R26_먼저_잡은_한_명만_성공한다() {
        UnoGame game = threePlayers();
        play(game, A, num(RED, 1));
        game.catchUno(B, A);

        assertError(() -> game.catchUno(C, A), ErrorCode.UNO_CATCH_CLOSED);
        assertThat(game.cardCount(A)).isEqualTo(3);
    }

    @Test
    void R26_자기_자신이나_다른_대상은_잡을_수_없다() {
        UnoGame game = threePlayers();
        play(game, A, num(RED, 1));

        assertError(() -> game.catchUno(A, A), ErrorCode.UNO_CATCH_CLOSED);
        assertError(() -> game.catchUno(C, B), ErrorCode.UNO_CATCH_CLOSED);
        assertError(() -> game.catchUno(D, A), ErrorCode.NOT_A_PLAYER);
    }

    @Test
    void R26_잡기_창이_없으면_잡을_수_없다() {
        UnoGame game = threePlayers();

        assertError(() -> game.catchUno(B, A), ErrorCode.UNO_CATCH_CLOSED);
    }

    @Test
    void R25_다음_차례_행동이_받아들여지면_창이_닫힌다() {
        UnoGame game = threePlayers();
        play(game, A, num(RED, 1));

        game.draw(B);

        assertThat(game.catchTarget()).isEmpty();
        assertError(() -> game.catchUno(C, A), ErrorCode.UNO_CATCH_CLOSED);
    }

    @Test
    void R25_실패한_행동은_창을_닫지_않는다() {
        UnoGame game = threePlayers();
        play(game, A, num(RED, 1));

        assertError(() -> play(game, B, num(BLUE, 8)), ErrorCode.UNO_CARD_NOT_PLAYABLE);

        assertThat(game.catchTarget()).contains(A);
    }

    @Test
    void R25_다른_사람의_외치기는_창을_닫지_않는다() {
        UnoGame game = threePlayers();
        play(game, A, num(RED, 1));

        game.callUno(B);

        assertThat(game.catchTarget()).contains(A);
    }

    @Test
    void R25_2명에서_같은_사람_차례가_다시_와도_그_사람의_다음_행동에서_닫힌다() {
        UnoGame game = game(List.of(A, B), List.of(List.of(skip(RED), num(RED, 2)), List.of(num(GREEN, 1), num(GREEN, 2))), FIRST, filler(10));
        play(game, A, skip(RED));
        assertThat(game.actor()).isEqualTo(A);
        assertThat(game.catchTarget()).contains(A);

        game.draw(A);

        assertThat(game.catchTarget()).isEmpty();
    }

    @Test
    void R27_잡기_창_동안_본인이_외치면_안전하다() {
        UnoGame game = threePlayers();
        play(game, A, num(RED, 1));

        game.callUno(A);

        assertThat(game.isDeclared(A)).isTrue();
        assertThat(game.catchTarget()).isEmpty();
        assertThat(game.latestEvents()).extracting(UnoEvent::type).containsExactly(UnoEventType.UNO_CALL);
        assertError(() -> game.catchUno(B, A), ErrorCode.UNO_CATCH_CLOSED);
    }

    @Test
    void R24_선언한_사람이_카드를_받아_2장_이상이_되면_선언이_풀린다() {
        UnoGame game = threePlayers();
        game.callUno(A);
        play(game, A, num(RED, 1));
        play(game, B, num(RED, 3));
        play(game, C, num(RED, 4));

        game.draw(A);

        assertThat(game.cardCount(A)).isEqualTo(2);
        assertThat(game.isDeclared(A)).isFalse();
    }

    @Test
    void R11_도전_전에_잡혀_받은_카드는_판정에_쓰지_않는다() {
        List<UnoCard> pile = new ArrayList<>(List.of(num(RED, 9), num(RED, 8)));
        pile.addAll(filler(10));
        UnoGame game = game(List.of(A, B, C), List.of(
                List.of(wildFour(0), num(GREEN, 1)), List.of(num(GREEN, 2), num(GREEN, 3)), List.of(num(GREEN, 4), num(GREEN, 6))), FIRST, pile);
        game.play(A, wildFour(0).id(), ChosenColor.of(BLUE));
        game.catchUno(C, A);
        assertThat(game.handOf(A)).contains(num(RED, 9), num(RED, 8));

        game.challenge(B);

        assertThat(game.latestEvents().get(0).reason()).isEqualTo(UnoEventReason.INNOCENT);
        assertThat(game.revealFor(B)).hasValueSatisfying(reveal -> assertThat(reveal.cards()).containsExactly(num(GREEN, 1)));
    }
}
