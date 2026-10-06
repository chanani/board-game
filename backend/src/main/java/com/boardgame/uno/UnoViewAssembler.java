package com.boardgame.uno;

import com.boardgame.uno.view.UnoCardView;
import com.boardgame.uno.view.UnoCatchView;
import com.boardgame.uno.view.UnoChallengeView;
import com.boardgame.uno.view.UnoEventView;
import com.boardgame.uno.view.UnoPlayerView;
import com.boardgame.uno.view.UnoResultPlayerView;
import com.boardgame.uno.view.UnoResultView;
import com.boardgame.uno.view.UnoRevealView;
import com.boardgame.uno.view.UnoView;
import java.util.List;

// 게임 상태를 보는 사람의 화면으로 옮긴다. 끝난 뒤에는 단계·차례·행동 가능 칸을 비운다(R28).
final class UnoViewAssembler {

    private UnoViewAssembler() {
    }

    static UnoView assemble(UnoGame game, PlayerId viewer, UnoViewContext context) {
        boolean live = !game.isFinished();
        return new UnoView(
                viewer.value(),
                live ? UnoStatus.IN_PROGRESS : UnoStatus.GAME_OVER,
                context.startedAtMillis(),
                live ? game.stage() : null,
                live ? Long.valueOf(game.actor().value()) : null,
                game.direction(),
                game.currentColor().orElse(null),
                UnoCardView.of(game.discardTop()),
                game.discardSize(),
                game.drawPileSize(),
                context.participantIds(),
                players(game),
                hand(game, viewer),
                live ? ids(game.playableFor(viewer)) : List.of(),
                live && game.isRiskyFour(viewer),
                live ? game.drawnFor(viewer).map(CardId::value).orElse(null) : null,
                live && game.canCallUno(viewer),
                live ? game.catchTarget().map(target -> new UnoCatchView(target.value())).orElse(null) : null,
                live && game.canCatch(viewer),
                live ? challenge(game) : null,
                game.revealFor(viewer).map(UnoRevealView::of).orElse(null),
                game.result().map(result -> result(game, result)).orElse(null),
                game.result().map(result -> Long.valueOf(result.winner().value())).orElse(null),
                context.timing().deadline(),
                context.timing().serverNow(),
                context.autoActors().ids(),
                context.autoActors().sequence(),
                events(game));
    }

    private static List<UnoPlayerView> players(UnoGame game) {
        return game.remaining()
                .stream()
                .map(player -> new UnoPlayerView(player.value(), game.cardCount(player), game.isDeclared(player)))
                .toList();
    }

    private static List<UnoCardView> hand(UnoGame game, PlayerId viewer) {
        if (!game.isRemaining(viewer)) {
            return null;
        }
        return UnoCardView.listOf(game.handOf(viewer));
    }

    private static List<Integer> ids(List<CardId> cards) {
        return cards.stream()
                .map(CardId::value)
                .toList();
    }

    private static UnoChallengeView challenge(UnoGame game) {
        return game.pendingCharge()
                .map(charge -> new UnoChallengeView(charge.by().value(), game.actor().value()))
                .orElse(null);
    }

    private static UnoResultView result(UnoGame game, UnoResult result) {
        List<UnoResultPlayerView> losers = game.remaining()
                .stream()
                .filter(player -> !result.isWinner(player))
                .map(player -> new UnoResultPlayerView(player.value(), UnoCardView.listOf(game.handOf(player)), game.pointsOf(player).value()))
                .toList();
        return new UnoResultView(result.reason(), result.winner().value(), result.points().value(), losers);
    }

    private static List<UnoEventView> events(UnoGame game) {
        return game.latestEvents()
                .stream()
                .map(UnoEventView::of)
                .toList();
    }
}
