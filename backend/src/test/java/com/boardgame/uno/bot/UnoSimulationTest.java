package com.boardgame.uno.bot;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.game.bot.BotMind;
import com.boardgame.game.bot.BotTable;
import com.boardgame.game.GameSession;
import com.boardgame.uno.UnoCard;
import com.boardgame.uno.UnoSessionFactory;
import com.boardgame.uno.UnoShuffler;
import com.boardgame.uno.view.UnoSessionView;
import com.boardgame.support.MutableClock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.junit.jupiter.api.Test;

// 스펙 §8: 컴퓨터만으로 실제 세션을 수백 판 돌린다(가짜 시계, 정해진 씨앗). 모든 판이 시간 초과·거절 없이 끝나야 한다.
class UnoSimulationTest {

    private static final BotDifficulty[] ALL = BotDifficulty.values();

    private final UnoBrain brain = new UnoBrain();

    @Test
    void 상_1명과_하_3명이_400판에서_상의_1등_비율이_하_평균의_1_5배_이상이다() {
        Random random = new Random(20261008L);
        int hardWins = 0;
        int easyWins = 0;
        for (int game = 0; game < 400; game++) {
            List<BotDifficulty> seats = new ArrayList<>(List.of(BotDifficulty.EASY, BotDifficulty.EASY, BotDifficulty.EASY));
            seats.add(game % 4, BotDifficulty.HARD);
            BotTable table = playFinished(seats, random);
            Long winner = winnerOf(table);
            if (winner == null) {
                continue;
            }
            if (seats.get((int) (winner - 1)) == BotDifficulty.HARD) {
                hardWins++;
                continue;
            }
            easyWins++;
        }
        System.out.printf("[UNO] hard wins %d, easy wins %d (avg %.1f)%n", hardWins, easyWins, easyWins / 3.0);
        assertThat((double) hardWins).isGreaterThanOrEqualTo((easyWins / 3.0) * 1.5);
    }

    @Test
    void 모든_난이도가_섞인_2_5명_판이_멈추지_않고_끝난다() {
        Random random = new Random(7L);
        for (int players = 2; players <= 5; players++) {
            for (int game = 0; game < 40; game++) {
                playFinished(mixed(players, random), random);
            }
        }
    }

    private BotTable playFinished(List<BotDifficulty> seats, Random random) {
        MutableClock clock = new MutableClock(Instant.parse("2026-10-08T00:00:00Z"));
        Map<Long, BotMind> minds = new LinkedHashMap<>();
        for (int seat = 0; seat < seats.size(); seat++) {
            minds.put((long) seat + 1, brain.mind(seats.get(seat)));
        }
        UnoSessionFactory factory = new UnoSessionFactory(clock, shuffler(random), count -> random.nextInt(count));
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

    private static Long winnerOf(BotTable table) {
        UnoSessionView view = (UnoSessionView) table.session().viewFor(1L);
        return view.game().winnerId();
    }

    private static UnoShuffler shuffler(Random random) {
        return cards -> {
            List<UnoCard> copy = new ArrayList<>(cards);
            Collections.shuffle(copy, random);
            return copy;
        };
    }
}
