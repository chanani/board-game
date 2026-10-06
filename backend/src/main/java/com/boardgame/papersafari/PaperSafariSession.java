package com.boardgame.papersafari;

import com.boardgame.game.GameAction;
import com.boardgame.game.GameCompleted;
import com.boardgame.game.GameOutcome;
import com.boardgame.game.GameSession;
import com.boardgame.game.MatchEntry;
import com.boardgame.game.ResultType;
import com.boardgame.game.RoundCompleted;
import com.boardgame.game.RoundEntry;
import com.boardgame.papersafari.view.PaperSafariSessionView;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.IntStream;

public class PaperSafariSession implements GameSession {

    // 토큰 규칙이 없어졌지만 전적 저장 구조(MatchEntry.tokens)는 그대로 두기로 해서 0을 기록한다.
    private static final int NO_TOKENS = 0;

    private final PaperSafariGame game;
    private final List<Long> participants;

    public PaperSafariSession(List<Long> memberIds, RoundFactory factory) {
        this.participants = List.copyOf(memberIds);
        this.game = PaperSafariGame.start(memberIds.stream().map(PlayerId::new).toList(), factory);
    }

    @Override
    public List<GameOutcome> act(long memberId, GameAction action) {
        PaperSafariCommand command = PaperSafariCommand.of(action.type());
        command.apply(game, new PlayerId(memberId), action);
        return outcomesIfFinished();
    }

    @Override
    public List<GameOutcome> forfeit(long memberId) {
        game.forfeit(new PlayerId(memberId));
        return outcomesIfFinished();
    }

    @Override
    public Object viewFor(long memberId) {
        return new PaperSafariSessionView(game.viewFor(new PlayerId(memberId)));
    }

    @Override
    public boolean isFinished() {
        return game.status() == GameStatus.GAME_OVER;
    }

    @Override
    public boolean isPlaying(long memberId) {
        return !isFinished() && game.isSeated(new PlayerId(memberId));
    }

    @Override
    public int roundNumber() {
        RoundNumber number = game.roundNumber();
        return number.value();
    }

    // 행동은 끝난 게임에서 거부되므로, 행동 직후 끝나 있으면 이번 행동으로 끝난 것이다.
    private List<GameOutcome> outcomesIfFinished() {
        List<GameOutcome> outcomes = new ArrayList<>();
        if (!isFinished()) {
            return outcomes;
        }
        game.lastRoundResult().map(this::toRoundCompleted).ifPresent(outcomes::add);
        outcomes.add(toGameCompleted());
        return outcomes;
    }

    private RoundCompleted toRoundCompleted(RoundResult result) {
        List<RoundEntry> entries = result.players().stream()
                .map(player -> roundEntry(result, player))
                .toList();
        return new RoundCompleted(roundNumber(), entries);
    }

    private RoundEntry roundEntry(RoundResult result, PlayerId player) {
        ResultType type = resultTypeOf(result.outcomeOf(player));
        Score score = result.scoreOf(player);
        return new RoundEntry(player.value(), type, score.value());
    }

    private GameCompleted toGameCompleted() {
        List<MatchEntry> entries = IntStream.range(0, participants.size())
                .mapToObj(this::matchEntry)
                .toList();
        return new GameCompleted(entries);
    }

    private MatchEntry matchEntry(int seat) {
        PlayerId player = new PlayerId(participants.get(seat));
        ResultType result = resultTypeOf(game.outcomeOf(player));
        return new MatchEntry(player.value(), result, NO_TOKENS, seat);
    }

    private ResultType resultTypeOf(RoundOutcome outcome) {
        return ResultType.valueOf(outcome.name());
    }
}
