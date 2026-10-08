package com.boardgame.oldmaid.bot;

import com.boardgame.game.GameAction;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Random;

// 중: 평범한 사람. 다른 자리를 들었다 뽑고, 조커를 받으면 다음 기회에 쿨다운이 지났을 때 한 번 섞는다(R36).
final class MediumOldMaid implements OldMaidPlayer {

    private final JokerArrival arrival = new JokerArrival();
    private final ShuffleMemory memory = new ShuffleMemory();

    @Override
    public void observe(OldMaidSight sight) {
        arrival.observe(sight);
    }

    @Override
    public List<Integer> lifts(int count, int chosen, Random random) {
        return OldMaidMoves.otherSlots(count, chosen, random);
    }

    @Override
    public Optional<GameAction> shuffle(OldMaidSight sight, Instant at) {
        if (!memory.cooled(at) || !arrival.take()) {
            return Optional.empty();
        }
        memory.remember(at, sight.turnSeq());
        return Optional.of(OldMaidMoves.shuffle());
    }
}
