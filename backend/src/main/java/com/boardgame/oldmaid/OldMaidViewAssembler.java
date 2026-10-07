package com.boardgame.oldmaid;

import com.boardgame.oldmaid.view.OldMaidCardView;
import com.boardgame.oldmaid.view.OldMaidEventView;
import com.boardgame.oldmaid.view.OldMaidPeekSignal;
import com.boardgame.oldmaid.view.OldMaidPeekView;
import com.boardgame.oldmaid.view.OldMaidPlayerView;
import com.boardgame.oldmaid.view.OldMaidResultView;
import com.boardgame.oldmaid.view.OldMaidView;
import java.util.List;

// 게임 상태를 보는 사람의 화면으로 옮긴다. 끝난 뒤에는 차례·신호·섞기 칸을 비운다.
final class OldMaidViewAssembler {

    private static final int RECENT_PAIRS = 6;

    private OldMaidViewAssembler() {
    }

    static OldMaidView assemble(OldMaidGame game, PlayerId viewer, OldMaidViewContext context) {
        boolean live = !game.isFinished();
        return new OldMaidView(
                viewer.value(),
                live ? OldMaidStatus.IN_PROGRESS : OldMaidStatus.GAME_OVER,
                context.startedAtMillis(),
                live ? Long.valueOf(game.drawer().value()) : null,
                live ? Long.valueOf(game.target().value()) : null,
                game.turnSeq().value(),
                context.participantIds(),
                players(game),
                hand(game, viewer),
                live ? peek(game) : null,
                game.canShuffle(viewer),
                game.discardCount(),
                pairs(game),
                game.result().map(OldMaidResultView::of).orElse(null),
                game.result().map(result -> Long.valueOf(result.winner().value())).orElse(null),
                context.timing().deadline(),
                context.timing().serverNow(),
                context.autoActors().ids(),
                context.autoActors().sequence(),
                events(game));
    }

    // 신호 내용(스펙 4.3): 지금 차례와 고르는 자리.
    static OldMaidPeekSignal signal(OldMaidGame game, OldMaidMatch match) {
        return OldMaidPeekSignal.of(match.startedAtMillis(), game.turnSeq().value(), game.drawer().value(),
                game.target().value(), peekIndex(game), game.peekSeq());
    }

    private static List<OldMaidPlayerView> players(OldMaidGame game) {
        return game.seats()
                .stream()
                .map(player -> new OldMaidPlayerView(player.value(), game.cardCount(player),
                        game.rankOf(player).map(FinishRank::value).orElse(null), game.hasForfeited(player)))
                .toList();
    }

    // 기권하지 않은 참가자만 자기 손패(끝냈으면 빈 목록). 관전자·기권자는 null.
    private static List<OldMaidCardView> hand(OldMaidGame game, PlayerId viewer) {
        if (!game.isParticipant(viewer)) {
            return null;
        }
        return OldMaidCardView.listOf(game.handOf(viewer));
    }

    private static OldMaidPeekView peek(OldMaidGame game) {
        return new OldMaidPeekView(peekIndex(game), game.peekSeq());
    }

    private static Integer peekIndex(OldMaidGame game) {
        return game.peekSlot()
                .map(SlotIndex::value)
                .orElse(null);
    }

    private static List<List<OldMaidCardView>> pairs(OldMaidGame game) {
        return game.recentPairs(RECENT_PAIRS)
                .stream()
                .map(pair -> OldMaidCardView.listOf(pair.cards()))
                .toList();
    }

    private static List<OldMaidEventView> events(OldMaidGame game) {
        return game.latestEvents()
                .stream()
                .map(OldMaidEventView::of)
                .toList();
    }
}
