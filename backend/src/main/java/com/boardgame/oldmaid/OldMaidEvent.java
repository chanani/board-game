package com.boardgame.oldmaid;

import java.util.List;

// 상태 변화에서 생긴 일 하나. 화면으로 나가는 기록이라 필드 수 제한의 예외다.
// 뽑은 카드 얼굴과 끼운 자리는 넣지 않는다(숨은 정보). seq·auto는 OldMaidEvents.commit이 찍는다.
public record OldMaidEvent(long seq, OldMaidEventType type, PlayerId actor, PlayerId target, List<PlayingCard> cards,
                           Integer count, OldMaidEndReason reason, boolean auto) {

    public OldMaidEvent {
        cards = List.copyOf(cards);
    }

    private static OldMaidEvent draft(OldMaidEventType type, PlayerId actor, PlayerId target, List<PlayingCard> cards,
                                      Integer count) {
        return new OldMaidEvent(0L, type, actor, target, cards, count, null, false);
    }

    public static OldMaidEvent start(PlayerId drawer, PlayerId target) {
        return draft(OldMaidEventType.START, drawer, target, List.of(), null);
    }

    public static OldMaidEvent dealPairs(PlayerId player, List<CardPair> pairs) {
        List<PlayingCard> cards = pairs.stream()
                .flatMap(pair -> pair.cards().stream())
                .toList();
        return draft(OldMaidEventType.DEAL_PAIRS, player, null, cards, pairs.size());
    }

    public static OldMaidEvent draw(PlayerId drawer, PlayerId from) {
        return draft(OldMaidEventType.DRAW, drawer, from, List.of(), 1);
    }

    public static OldMaidEvent pair(PlayerId player, CardPair pair) {
        return draft(OldMaidEventType.PAIR, player, null, pair.cards(), null);
    }

    public static OldMaidEvent finish(PlayerId player, FinishRank rank) {
        return draft(OldMaidEventType.FINISH, player, null, List.of(), rank.value());
    }

    public static OldMaidEvent shuffle(PlayerId player) {
        return draft(OldMaidEventType.SHUFFLE, player, null, List.of(), null);
    }

    /** receiver: 받는 사람이 없으면 null. */
    public static OldMaidEvent forfeit(PlayerId leaver, PlayerId receiver, int count) {
        return draft(OldMaidEventType.FORFEIT, leaver, receiver, List.of(), count);
    }

    public static OldMaidEvent gameEnd(RankedPlayer lastHolder, OldMaidEndReason reason) {
        return new OldMaidEvent(0L, OldMaidEventType.GAME_END, lastHolder.player(), null, List.of(),
                lastHolder.rank().value(), reason, false);
    }

    public OldMaidEvent stamped(long newSeq, boolean byTimeout) {
        return new OldMaidEvent(newSeq, type, actor, target, cards, count, reason, byTimeout);
    }
}
