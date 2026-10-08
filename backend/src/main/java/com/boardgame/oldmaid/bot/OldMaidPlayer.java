package com.boardgame.oldmaid.bot;

import com.boardgame.game.GameAction;
import com.boardgame.game.bot.ThinkTime;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Random;

// 난이도별로 달라지는 부분: 짝 버리기 생각 시간, 고르는 카드 신호, 섞기.
interface OldMaidPlayer {

    default void observe(OldMaidSight sight) {
    }

    default Duration discardThink(OldMaidSight sight, Random random) {
        return ThinkTime.standard(random);
    }

    List<Integer> lifts(int count, int chosen, Random random);

    Optional<GameAction> shuffle(OldMaidSight sight, Instant at);
}
