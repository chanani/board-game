package com.boardgame.oldmaid.bot;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Random;

// 상: 조커를 든 동안 내 손패가 뽑힐 차례마다 한 번 섞는다(R36, 쿨다운 지킴).
// 한 번 정한 섞기는 그 차례 동안 실제로 섞은 것을 볼 때까지 지킨다(쿨다운 중이면 쿨다운이 끝날 때 섞는다).
// 뽑기(R34·R35): 화면은 뽑힌 카드가 상대 손패의 어느 자리에 끼워졌는지 알려 주지 않는다. 그래서 추적할 공개 정보가
// 없고, 숨은 정보를 읽어 강하게 만들지 않으므로(R16·D7) 중과 같이 무작위 자리를 뽑는다.
final class HardOldMaid implements OldMaidPlayer {

    private final ShuffleIntent intent = new ShuffleIntent();

    @Override
    public void observe(OldMaidSight sight) {
        intent.observe(sight);
    }

    @Override
    public List<Integer> lifts(int count, int chosen, Random random) {
        return OldMaidMoves.otherSlots(count, chosen, random);
    }

    @Override
    public Optional<Duration> shuffleDelay(OldMaidSight sight, Instant now, Duration think) {
        if (!sight.holdsJoker() || !sight.isTargeted()) {
            return Optional.empty();
        }
        return intent.delay(sight.turnSeq(), now, think);
    }
}
