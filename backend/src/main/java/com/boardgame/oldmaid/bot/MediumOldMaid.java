package com.boardgame.oldmaid.bot;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Random;

// 중: 평범한 사람. 다른 자리를 들었다 뽑고, 조커를 받으면 다음 기회에 쿨다운이 지났을 때 한 번 섞는다(R36).
// 한 번 정한 섞기는 실제로 섞은 것을 볼 때까지 지킨다(예약이 취소돼도 다시 물으면 남은 시간으로 섞는다).
final class MediumOldMaid implements OldMaidPlayer {

    private final JokerArrival arrival = new JokerArrival();
    private final ShuffleIntent intent = new ShuffleIntent();

    @Override
    public void observe(OldMaidSight sight) {
        arrival.observe(sight);
        if (intent.observe(sight)) {
            arrival.shuffled();
        }
    }

    @Override
    public List<Integer> lifts(int count, int chosen, Random random) {
        return OldMaidMoves.otherSlots(count, chosen, random);
    }

    @Override
    public Optional<Duration> shuffleDelay(OldMaidSight sight, Instant now, Duration think) {
        if (!arrival.isWaiting()) {
            return Optional.empty();
        }
        return intent.delay(arrival.key(), now, think);
    }
}
