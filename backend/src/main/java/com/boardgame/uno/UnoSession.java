// B/uno/UnoSession.java
package com.boardgame.uno;

import com.boardgame.game.GameAction;
import com.boardgame.game.GameCompleted;
import com.boardgame.game.GameOutcome;
import com.boardgame.game.GameSession;
import com.boardgame.game.MatchEntry;
import com.boardgame.game.ResultType;
import com.boardgame.game.RoundCompleted;
import com.boardgame.game.RoundEntry;
import com.boardgame.uno.view.UnoSessionView;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import java.util.stream.IntStream;

public class UnoSession implements GameSession {

    private static final int ROUND_NUMBER = 1;
    private static final int NO_TOKENS = 0;
    private static final int LOSER_SCORE = 0;

    private final UnoGame game;
    private final UnoMatch match;
    private final UnoTimer timer;

    public UnoSession(List<Long> memberIds, UnoRoundFactory factory, Clock clock) {
        List<PlayerId> players = memberIds.stream()
                .map(PlayerId::new)
                .toList();
        this.match = new UnoMatch(players, clock.instant());
        this.game = UnoGame.start(players, factory);
        this.timer = new UnoTimer(clock, game.stageSeq());
    }

    @Override
    public List<GameOutcome> act(long memberId, GameAction action) {
        UnoCommand command = UnoCommand.of(action.type());
        command.apply(game, new PlayerId(memberId), action);
        timer.humanActed(game.stageSeq());
        return outcomesIfFinished();
    }

    @Override
    public List<GameOutcome> forfeit(long memberId) {
        game.forfeit(new PlayerId(memberId));
        timer.follow(game.stageSeq());
        return outcomesIfFinished();
    }

    // R40: 자동 행동은 정해져 있어 무작위를 쓰지 않는다.
    @Override
    public List<GameOutcome> autoAct(Random random) {
        PlayerId actor = game.autoAct();
        timer.autoActed(actor, game.stageSeq());
        return outcomesIfFinished();
    }

    @Override
    public Optional<Instant> deadline() {
        if (isFinished()) {
            return Optional.empty();
        }
        return Optional.of(timer.deadline());
    }

    @Override
    public Object viewFor(long memberId) {
        UnoViewContext context = new UnoViewContext(match, timer.timing(!isFinished()), timer.autoActors());
        return new UnoSessionView(game.viewFor(new PlayerId(memberId), context));
    }

    @Override
    public boolean isFinished() {
        return game.isFinished();
    }

    @Override
    public boolean isPlaying(long memberId) {
        return !isFinished() && game.isRemaining(new PlayerId(memberId));
    }

    @Override
    public int roundNumber() {
        return ROUND_NUMBER;
    }

    // 끝난 게임은 행동을 받지 않으므로, 행동 직후 끝나 있으면 이번 행동으로 끝난 것이다(결과는 딱 한 번).
    private List<GameOutcome> outcomesIfFinished() {
        List<GameOutcome> outcomes = new ArrayList<>();
        if (!isFinished()) {
            return outcomes;
        }
        UnoResult result = game.result().orElseThrow();
        if (result.reason() == UnoEndReason.EMPTY_HAND) {
            outcomes.add(roundCompleted(result));
        }
        outcomes.add(gameCompleted(result));
        return outcomes;
    }

    // R32: 남은 참가자만, 이긴 사람은 얻은 점수, 진 사람은 0점.
    private RoundCompleted roundCompleted(UnoResult result) {
        List<RoundEntry> entries = game.remaining()
                .stream()
                .map(player -> roundEntry(result, player))
                .toList();
        return new RoundCompleted(ROUND_NUMBER, entries);
    }

    private RoundEntry roundEntry(UnoResult result, PlayerId player) {
        if (result.isWinner(player)) {
            return new RoundEntry(player.value(), ResultType.WIN, result.points().value());
        }
        return new RoundEntry(player.value(), ResultType.LOSE, LOSER_SCORE);
    }

    // R32: 처음 참가자 모두(기권자는 LOSE), seat = 처음 memberIds 순서.
    private GameCompleted gameCompleted(UnoResult result) {
        List<PlayerId> participants = match.participants();
        List<MatchEntry> entries = IntStream.range(0, participants.size())
                .mapToObj(seat -> matchEntry(result, participants.get(seat), seat))
                .toList();
        return new GameCompleted(entries);
    }

    private MatchEntry matchEntry(UnoResult result, PlayerId player, int seat) {
        if (result.isWinner(player)) {
            return new MatchEntry(player.value(), ResultType.WIN, NO_TOKENS, seat);
        }
        return new MatchEntry(player.value(), ResultType.LOSE, NO_TOKENS, seat);
    }
}
