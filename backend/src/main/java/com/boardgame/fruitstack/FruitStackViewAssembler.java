package com.boardgame.fruitstack;

import com.boardgame.fruitstack.view.FruitStackBoardSignal;
import com.boardgame.fruitstack.view.FruitStackPlayerView;
import com.boardgame.fruitstack.view.FruitStackResultView;
import com.boardgame.fruitstack.view.FruitStackStandingView;
import com.boardgame.fruitstack.view.FruitStackView;
import com.boardgame.game.ResultType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

// 스펙 4.6: 보는 사람 id 말고 모두에게 같은 화면.
public final class FruitStackViewAssembler {

    private static final String IN_PROGRESS = "IN_PROGRESS";
    private static final String GAME_OVER = "GAME_OVER";

    private FruitStackViewAssembler() {
    }

    public static FruitStackView view(FruitStackGame game, long viewerId) {
        Optional<FruitStackResult> result = game.result();
        return new FruitStackView(viewerId, statusOf(game), millisOf(game.startedAt()), seedOf(game),
                participantIds(game), players(game), result.map(FruitStackViewAssembler::resultView).orElse(null),
                result.flatMap(FruitStackViewAssembler::winnerId).orElse(null), deadlineOf(game),
                millisOf(game.now()));
    }

    public static FruitStackBoardSignal signal(FruitStackGame game, long playerId, long seq, String board) {
        return FruitStackBoardSignal.of(millisOf(game.startedAt()), playerId, seq, board);
    }

    private static String statusOf(FruitStackGame game) {
        if (game.isFinished()) {
            return GAME_OVER;
        }
        return IN_PROGRESS;
    }

    private static long millisOf(Instant instant) {
        return instant.toEpochMilli();
    }

    private static int seedOf(FruitStackGame game) {
        Seed seed = game.seed();
        return seed.value();
    }

    private static List<Long> participantIds(FruitStackGame game) {
        return game.participants()
                .stream()
                .map(PlayerId::value)
                .toList();
    }

    private static List<FruitStackPlayerView> players(FruitStackGame game) {
        return game.participants()
                .stream()
                .map(player -> playerView(game, player))
                .toList();
    }

    private static FruitStackPlayerView playerView(FruitStackGame game, PlayerId player) {
        Score score = game.scoreOf(player);
        PlayerState state = game.stateOf(player);
        return new FruitStackPlayerView(player.value(), score.value(), state.name());
    }

    // 등수 순, 같은 등수는 자리 순.
    private static FruitStackResultView resultView(FruitStackResult result) {
        FruitStackEndReason reason = result.reason();
        Standings standings = result.standings();
        List<FruitStackStandingView> views = standings.entries()
                .stream()
                .map(FruitStackViewAssembler::standingView)
                .toList();
        return new FruitStackResultView(reason.name(), views);
    }

    private static FruitStackStandingView standingView(Standing standing) {
        PlayerId player = standing.player();
        Score score = standing.score();
        ResultType outcome = standing.result();
        PlayerState state = standing.state();
        return new FruitStackStandingView(player.value(), score.value(), outcome.name(), standing.placeValue(),
                state.name());
    }

    private static Optional<Long> winnerId(FruitStackResult result) {
        Standings standings = result.standings();
        return standings.winner()
                .map(PlayerId::value);
    }

    // 끝났으면 null, 아니면 경기 상한(시작 + 10분)의 epoch ms.
    private static Long deadlineOf(FruitStackGame game) {
        if (game.isFinished()) {
            return null;
        }
        return millisOf(game.limitAt());
    }
}
