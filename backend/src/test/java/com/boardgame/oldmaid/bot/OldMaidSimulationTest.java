package com.boardgame.oldmaid.bot;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameSession;
import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.game.bot.BotMind;
import com.boardgame.game.bot.BotTable;
import com.boardgame.oldmaid.OldMaidSessionFactory;
import com.boardgame.oldmaid.OldMaidShuffler;
import com.boardgame.oldmaid.PlayingCard;
import com.boardgame.support.MutableClock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.junit.jupiter.api.Test;

// 스펙 §8: 도둑잡기는 컴퓨터만으로 끝까지 진행되는지만 본다(섞기 쿨다운·고르는 카드 신호 포함, 시간 초과·거절 0).
class OldMaidSimulationTest {

    private static final BotDifficulty[] ALL = BotDifficulty.values();

    private final OldMaidBrain brain = new OldMaidBrain();

    @Test
    void 모든_난이도가_섞인_2_6명_판이_멈추지_않고_끝난다() {
        Random random = new Random(20261008L);
        int steps = 0;
        int shuffles = 0;
        for (int players = 2; players <= 6; players++) {
            for (int game = 0; game < 40; game++) {
                BotTable table = playFinished(mixed(players, random), random);
                steps += table.steps();
                shuffles += table.applied("SHUFFLE");
            }
        }
        System.out.printf("[OldMaid] 200 games, %d bot steps, %d shuffles%n", steps, shuffles);
        // R36: 중·상이 낀 판에서 섞기가 실제로 일어난다(예약이 바뀌어도 결정이 사라지지 않는다).
        assertThat(shuffles).isPositive();
    }

    @Test
    void 상끼리_두어도_판이_끝나고_조커를_든_상은_섞는다() {
        Random random = new Random(11L);
        int shuffles = 0;
        for (int players : new int[] {2, 6}) {
            for (int game = 0; game < 30; game++) {
                shuffles += playFinished(Collections.nCopies(players, BotDifficulty.HARD), random).applied("SHUFFLE");
            }
        }
        System.out.printf("[OldMaid] hard-only 60 games, %d shuffles%n", shuffles);
        // 조커를 든 상은 판마다 적어도 한 번은 뽑힐 차례를 맞는다.
        assertThat(shuffles).isGreaterThanOrEqualTo(60);
    }

    private BotTable playFinished(List<BotDifficulty> seats, Random random) {
        MutableClock clock = new MutableClock(Instant.parse("2026-10-08T00:00:00Z"));
        Map<Long, BotMind> minds = new LinkedHashMap<>();
        for (int seat = 0; seat < seats.size(); seat++) {
            minds.put((long) seat + 1, brain.mind(seats.get(seat)));
        }
        OldMaidSessionFactory factory = new OldMaidSessionFactory(clock, shuffler(random), bound -> random.nextInt(bound));
        GameSession session = factory.create(List.copyOf(minds.keySet()));
        BotTable table = new BotTable(session, minds, clock).play(random);
        assertThat(session.isFinished()).as("판이 끝남 %s", seats).isTrue();
        assertThat(table.timeouts()).as("시간 초과 %s", seats).isZero();
        assertThat(table.rejections()).as("거절 %s", seats).isZero();
        return table;
    }

    private static List<BotDifficulty> mixed(int players, Random random) {
        List<BotDifficulty> seats = new ArrayList<>();
        for (int seat = 0; seat < players; seat++) {
            seats.add(ALL[random.nextInt(ALL.length)]);
        }
        return seats;
    }

    private static OldMaidShuffler shuffler(Random random) {
        return cards -> {
            List<PlayingCard> copy = new ArrayList<>(cards);
            Collections.shuffle(copy, random);
            return copy;
        };
    }
}
