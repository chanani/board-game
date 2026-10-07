package com.boardgame.oldmaid;

import static com.boardgame.oldmaid.OldMaidFixtures.A;
import static com.boardgame.oldmaid.OldMaidFixtures.B;
import static com.boardgame.oldmaid.OldMaidFixtures.C;
import static com.boardgame.oldmaid.OldMaidFixtures.D;
import static com.boardgame.oldmaid.OldMaidFixtures.JOKER;
import static com.boardgame.oldmaid.OldMaidFixtures.KEEP_ORDER;
import static com.boardgame.oldmaid.OldMaidFixtures.c;
import static com.boardgame.oldmaid.OldMaidFixtures.choice;
import static com.boardgame.oldmaid.OldMaidFixtures.d;
import static com.boardgame.oldmaid.OldMaidFixtures.discardAllPairs;
import static com.boardgame.oldmaid.OldMaidFixtures.game;
import static com.boardgame.oldmaid.OldMaidFixtures.h;
import static com.boardgame.oldmaid.OldMaidFixtures.hands;
import static com.boardgame.oldmaid.OldMaidFixtures.opening;
import static com.boardgame.oldmaid.OldMaidFixtures.s;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

class OldMaidSetupTest {

    @Test
    void 인원은_2명에서_6명() {
        OldMaidRoundFactory factory = new OldMaidRoundFactory(new RandomOldMaidShuffler(), bound -> 0);
        List<PlayerId> seven = List.of(A, B, C, D, new PlayerId(5L), new PlayerId(6L), new PlayerId(7L));
        List<PlayerId> six = seven.subList(0, 6);

        assertThatThrownBy(() -> OldMaidGame.start(List.of(A), factory))
                .isInstanceOfSatisfying(BusinessException.class,
                        error -> assertThat(error.errorCode()).isEqualTo(ErrorCode.OLD_MAID_INVALID_PLAYER_COUNT));
        assertThatThrownBy(() -> OldMaidGame.start(seven, factory)).isInstanceOf(BusinessException.class);
        assertThat(OldMaidGame.start(six, factory).seats()).hasSize(6);
    }

    @Test
    void R5_고른_첫_사람부터_한_장씩_53장을_모두_나눈다() {
        // 덱을 거꾸로(조커 먼저) 두고 첫 사람으로 seat 1(B)을 고른다: B가 52(조커)부터 받는다.
        OldMaidShuffler reversed = cards -> {
            List<PlayingCard> copy = new ArrayList<>(cards);
            Collections.reverse(copy);
            return copy;
        };
        OldMaidGame game = OldMaidGame.start(List.of(A, B, C), new OldMaidRoundFactory(reversed, bound -> 1));

        int total = game.seats().stream().mapToInt(game::cardCount).sum() + game.discardCount();
        assertThat(total).isEqualTo(53);
        assertThat(game.handOf(B)).contains(JOKER);
        assertThat(game.latestEvents().get(0).type()).isEqualTo(OldMaidEventType.DEAL);
        assertThat(game.latestEvents().get(0).actor()).isEqualTo(B);
        assertThat(game.discardCount()).isZero();
    }

    @Test
    void R36_나눈_뒤_서버는_짝을_버리지_않고_처음_버리기_단계로_시작한다() {
        OldMaidGame game = opening(A, hands(
                List.of(s(Rank.ACE), h(Rank.ACE), s(Rank.TWO)),
                List.of(d(Rank.TWO), JOKER),
                List.of(c(Rank.THREE))));

        assertThat(game.isOpening()).isTrue();
        assertThat(game.stage()).isEqualTo(OldMaidStage.OPENING_DISCARD);
        assertThat(game.handOf(A)).containsExactly(s(Rank.ACE), h(Rank.ACE), s(Rank.TWO));
        assertThat(game.discardCount()).isZero();
        assertThat(game.turnSeq()).isEqualTo(new TurnSeq(0L));
        assertThat(game.latestEvents()).extracting(OldMaidEvent::type).containsExactly(OldMaidEventType.DEAL);
        assertThat(game.latestEvents().get(0).seq()).isEqualTo(1L);
        assertThatThrownBy(game::drawer)
                .isInstanceOfSatisfying(BusinessException.class,
                        error -> assertThat(error.errorCode()).isEqualTo(ErrorCode.INVALID_PHASE));
    }

    @Test
    void R36_R9_짝을_모두_버리면_첫_사람이_처음_뽑는다() {
        OldMaidGame game = opening(A, hands(
                List.of(s(Rank.ACE), h(Rank.ACE), s(Rank.TWO)),
                List.of(d(Rank.TWO), JOKER),
                List.of(c(Rank.THREE))));

        game.discard(A, choice(h(Rank.ACE), s(Rank.ACE)));

        assertThat(game.handOf(A)).containsExactly(s(Rank.TWO));
        assertThat(game.discards()).containsExactly(new DiscardedPair(A, new CardPair(h(Rank.ACE), s(Rank.ACE))));
        assertThat(game.isOpening()).isFalse();
        assertThat(game.stage()).isEqualTo(OldMaidStage.DRAW);
        assertThat(game.drawer()).isEqualTo(A);
        assertThat(game.target()).isEqualTo(B);
        assertThat(game.turnSeq()).isEqualTo(TurnSeq.first());
        assertThat(game.latestEvents()).extracting(OldMaidEvent::type)
                .containsExactly(OldMaidEventType.PAIR, OldMaidEventType.START);
        assertThat(game.latestEvents()).extracting(OldMaidEvent::seq).containsExactly(2L, 3L);
    }

    @Test
    void R8_처음부터_빈_손은_첫_사람부터_순서대로_등수를_받고_R9_첫_차례는_다음_카드_가진_사람() {
        OldMaidGame game = game(B, hands(
                List.of(s(Rank.FIVE)),
                List.of(s(Rank.ACE), h(Rank.ACE)),
                List.of(d(Rank.FIVE), JOKER, c(Rank.SIX)),
                List.of(s(Rank.KING), h(Rank.KING))));

        assertThat(game.finishRankOf(B)).contains(new FinishRank(1));
        assertThat(game.finishRankOf(D)).contains(new FinishRank(2));
        assertThat(game.drawer()).isEqualTo(C);
        assertThat(game.target()).isEqualTo(A);
        assertThat(game.latestEvents()).filteredOn(event -> event.type() == OldMaidEventType.FINISH)
                .extracting(OldMaidEvent::actor).containsExactly(B, D);
    }

    @Test
    void R7_D18_모두_짝을_다_버렸다고_셈해_카드를_가진_사람이_2명보다_적으면_미리_다시_나눈다() {
        // 첫 섞기: 덱 순서 그대로 → 2명이면 짝을 다 버린 뒤 A는 조커만, B는 0장이라 다시 나눈다.
        // 두 번째: 한 칸 돌린 덱(1..52, 0) → 다 버리면 A는 스페이드 A, B는 다이아몬드 A와 조커가 남는다.
        AtomicInteger shuffles = new AtomicInteger();
        OldMaidShuffler shuffler = cards -> {
            if (shuffles.getAndIncrement() == 0) {
                return KEEP_ORDER.shuffle(cards);
            }
            List<PlayingCard> rotated = new ArrayList<>(cards.subList(1, cards.size()));
            rotated.add(cards.get(0));
            return rotated;
        };

        OldMaidGame game = OldMaidGame.start(List.of(A, B), new OldMaidRoundFactory(shuffler, bound -> 0));

        assertThat(shuffles.get()).isEqualTo(2);
        assertThat(game.isOpening()).isTrue();
        assertThat(game.cardCount(A)).isEqualTo(27);
        discardAllPairs(game);
        assertThat(game.handOf(A)).containsExactly(s(Rank.ACE));
        assertThat(game.handOf(B)).containsExactly(d(Rank.ACE), JOKER);
        assertThat(game.drawer()).isEqualTo(A);
        assertThat(game.target()).isEqualTo(B);
    }

    @Test
    void R10_짝을_버린_손패는_언제나_14장_이하이고_남은_카드는_홀수다() {
        OldMaidRoundFactory factory = new OldMaidRoundFactory(new RandomOldMaidShuffler(),
                bound -> ThreadLocalRandom.current().nextInt(bound));
        for (int trial = 0; trial < 200; trial++) {
            OldMaidGame game = OldMaidGame.start(List.of(A, B, C), factory);
            game.autoAct(new Random());
            assertThat(game.isOpening()).isFalse();
            assertThat(game.holds(game.drawer())).isTrue();
            assertThat(game.seats()).allMatch(player -> game.cardCount(player) <= 14);
            int remaining = game.seats().stream().mapToInt(game::cardCount).sum();
            assertThat(remaining % 2).isEqualTo(1);
        }
    }
}
