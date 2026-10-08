package com.boardgame.uno.bot;

import com.boardgame.uno.UnoColor;
import com.boardgame.uno.UnoEventType;
import com.boardgame.uno.view.UnoEventView;
import java.util.HashSet;
import java.util.Set;

// R31: 상의 +4 도전 어림에 쓰는 공개 기록. 누가 어떤 색일 때 내지 못하고 뽑았는지(DRAW 이벤트와 그때의 색)를 기억한다.
// 그 사람이 벌칙으로 카드를 받거나(PENALTY) 그 색을 내면(PLAY) 다시 가졌을 수 있으므로 지운다.
// 이벤트는 마지막 상태 변화분만 오므로 순번(seq)으로 한 번씩만 읽는다.
final class UnoMemory {

    private final Set<Miss> misses = new HashSet<>();
    private long lastSeq;

    void observe(UnoSight sight) {
        UnoColor color = sight.currentColor()
                .orElse(null);
        sight.events()
                .stream()
                .filter(event -> event.seq() > lastSeq)
                .forEach(event -> read(event, color));
    }

    boolean missed(long playerId, UnoColor color) {
        return misses.contains(new Miss(playerId, color));
    }

    private void read(UnoEventView event, UnoColor color) {
        lastSeq = Math.max(lastSeq, event.seq());
        if (event.type() == UnoEventType.DRAW) {
            remember(event.actorId(), color);
            return;
        }
        if (event.type() == UnoEventType.PENALTY) {
            misses.removeIf(miss -> miss.isOf(event.targetId()));
            return;
        }
        if (event.type() == UnoEventType.PLAY) {
            forgetPlayed(event);
        }
    }

    private void remember(Long actor, UnoColor color) {
        if (actor == null || color == null) {
            return;
        }
        misses.add(new Miss(actor, color));
    }

    private void forgetPlayed(UnoEventView event) {
        misses.remove(new Miss(event.actorId(), event.card().color()));
        misses.remove(new Miss(event.actorId(), event.color()));
    }

    private record Miss(Long playerId, UnoColor color) {

        boolean isOf(Long player) {
            return playerId.equals(player);
        }
    }
}
