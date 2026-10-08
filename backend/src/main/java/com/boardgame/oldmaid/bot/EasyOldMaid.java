package com.boardgame.oldmaid.bot;

import com.boardgame.game.GameAction;
import com.boardgame.game.bot.ThinkTime;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Random;

// 하: 규칙만 아는 초보. 신호 없이 바로 뽑고 섞지 않는다. 처음 짝 버리기는 사람처럼 2.5~5초 뒤에 한다(R33).
final class EasyOldMaid implements OldMaidPlayer {

    private static final int OPENING_MIN_MILLIS = 2500;
    private static final int OPENING_MAX_MILLIS = 5000;

    @Override
    public Duration discardThink(OldMaidSight sight, Random random) {
        if (sight.isOpening()) {
            return ThinkTime.between(random, OPENING_MIN_MILLIS, OPENING_MAX_MILLIS);
        }
        return ThinkTime.standard(random);
    }

    @Override
    public List<Integer> lifts(int count, int chosen, Random random) {
        return List.of();
    }

    @Override
    public Optional<GameAction> shuffle(OldMaidSight sight, Instant at) {
        return Optional.empty();
    }
}
