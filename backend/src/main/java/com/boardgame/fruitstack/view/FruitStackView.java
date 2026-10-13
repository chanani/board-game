package com.boardgame.fruitstack.view;

import java.util.List;

// result·winnerId·deadline은 없으면 null. deadline·serverNow·startedAt은 epoch ms.
public record FruitStackView(long viewerId, String status, long startedAt, int seed, List<Long> participantIds,
                             List<FruitStackPlayerView> players, FruitStackResultView result, Long winnerId,
                             Long deadline, long serverNow) {
}
