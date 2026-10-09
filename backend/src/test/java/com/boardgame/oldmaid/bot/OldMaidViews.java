package com.boardgame.oldmaid.bot;

import com.boardgame.oldmaid.OldMaidEventType;
import com.boardgame.oldmaid.OldMaidStage;
import com.boardgame.oldmaid.OldMaidStatus;
import com.boardgame.oldmaid.Rank;
import com.boardgame.oldmaid.Suit;
import com.boardgame.oldmaid.view.OldMaidCardView;
import com.boardgame.oldmaid.view.OldMaidEventView;
import com.boardgame.oldmaid.view.OldMaidPlayerView;
import com.boardgame.oldmaid.view.OldMaidSessionView;
import com.boardgame.oldmaid.view.OldMaidView;
import java.time.Instant;
import java.util.List;

// 컴퓨터 자리 화면을 손으로 만든다(24필드 순서는 OldMaidView).
final class OldMaidViews {

    static final long ME = -1L;
    static final long OTHER = -2L;

    private OldMaidViews() {
    }

    static OldMaidSessionView view(long me, OldMaidStage stage, Long current, Long target, long turnSeq,
                                   List<OldMaidCardView> hand, List<OldMaidPlayerView> players,
                                   boolean canShuffle, boolean canDiscard) {
        OldMaidView game = new OldMaidView(me, OldMaidStatus.IN_PROGRESS, stage, 0L, current, target, turnSeq,
                players.stream().map(OldMaidPlayerView::playerId).toList(), players, hand, null,
                canShuffle, canDiscard, 0, List.of(), List.of(), null, null, null, 0L, List.of(), 0L, List.of(), null);
        return new OldMaidSessionView(game);
    }

    static OldMaidCardView card(int id) {
        return new OldMaidCardView(id, Suit.SPADES, Rank.TWO);
    }

    static OldMaidCardView joker() {
        return new OldMaidCardView(52, null, Rank.JOKER);
    }

    static OldMaidPlayerView player(long id, int cards) {
        return new OldMaidPlayerView(id, cards, null, false, true);
    }

    /** 내가 상대 손패 cards장 중 하나를 뽑을 차례. */
    static OldMaidSessionView drawing(int cards) {
        return view(ME, OldMaidStage.DRAW, ME, OTHER, 3L, List.of(card(1)),
                List.of(player(ME, 1), player(OTHER, cards)), false, false);
    }

    /** 상대가 나(조커 든 쪽)를 뽑을 차례. */
    static OldMaidSessionView targeted(long turnSeq, boolean holdsJoker) {
        List<OldMaidCardView> hand = holdsJoker ? List.of(card(1), joker()) : List.of(card(1));
        return view(ME, OldMaidStage.DRAW, OTHER, ME, turnSeq, hand,
                List.of(player(ME, hand.size()), player(OTHER, 3)), true, false);
    }

    static OldMaidSessionView discarding(OldMaidStage stage) {
        return view(ME, stage, stage == OldMaidStage.DRAW ? null : ME, null, 0L, List.of(card(1), card(14)),
                List.of(player(ME, 2), player(OTHER, 2)), false, true);
    }

    /** 같은 화면에 actor의 SHUFFLE 사건(seq)과 서버 시각 at을 싣는다. */
    static OldMaidSessionView withShuffle(OldMaidSessionView base, long seq, long actor, Instant at) {
        OldMaidView g = base.game();
        OldMaidEventView shuffle = new OldMaidEventView(seq, OldMaidEventType.SHUFFLE, actor, null, List.of(), null,
                null, false);
        OldMaidView game = new OldMaidView(g.viewerId(), g.status(), g.stage(), g.startedAt(), g.currentPlayerId(),
                g.targetId(), g.turnSeq(), g.participantIds(), g.players(), g.hand(), g.peek(), g.canShuffle(),
                g.canDiscard(), g.discardCount(), g.recentPairs(), g.discards(), g.result(), g.winnerId(), g.deadline(),
                at.toEpochMilli(), g.lastAutoActorIds(), g.autoActSeq(), List.of(shuffle), g.targetHand());
        return new OldMaidSessionView(game);
    }
}
