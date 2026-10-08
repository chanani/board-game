package com.boardgame.oldmaid.bot;

import com.boardgame.oldmaid.OldMaidStage;
import com.boardgame.oldmaid.OldMaidStatus;
import com.boardgame.oldmaid.Rank;
import com.boardgame.oldmaid.Suit;
import com.boardgame.oldmaid.view.OldMaidCardView;
import com.boardgame.oldmaid.view.OldMaidPlayerView;
import com.boardgame.oldmaid.view.OldMaidSessionView;
import com.boardgame.oldmaid.view.OldMaidView;
import java.util.List;

// 컴퓨터 자리 화면을 손으로 만든다(23필드 순서는 OldMaidView).
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
                canShuffle, canDiscard, 0, List.of(), List.of(), null, null, null, 0L, List.of(), 0L, List.of());
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
}
