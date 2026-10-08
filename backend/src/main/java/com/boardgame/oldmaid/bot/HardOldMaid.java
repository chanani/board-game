package com.boardgame.oldmaid.bot;

import com.boardgame.game.GameAction;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Random;

// 상: 조커를 든 동안 내 손패가 뽑힐 차례마다 한 번 섞는다(R36, 쿨다운 지킴).
// 뽑기(R34·R35): 화면은 뽑힌 카드가 상대 손패의 어느 자리에 끼워졌는지 알려 주지 않는다. 그래서 추적할 공개 정보가
// 없고, 숨은 정보를 읽어 강하게 만들지 않으므로(R16·D7) 중과 같이 무작위 자리를 뽑는다.
final class HardOldMaid implements OldMaidPlayer {

    private final ShuffleMemory memory = new ShuffleMemory();

    @Override
    public List<Integer> lifts(int count, int chosen, Random random) {
        return OldMaidMoves.otherSlots(count, chosen, random);
    }

    @Override
    public Optional<GameAction> shuffle(OldMaidSight sight, Instant at) {
        if (!sight.holdsJoker() || !sight.isTargeted()) {
            return Optional.empty();
        }
        if (memory.shuffledIn(sight.turnSeq()) || !memory.cooled(at)) {
            return Optional.empty();
        }
        memory.remember(at, sight.turnSeq());
        return Optional.of(OldMaidMoves.shuffle());
    }
}
