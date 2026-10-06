package com.boardgame.papersafari;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
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
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.IntStream;

public class PaperSafariSession implements GameSession {

    private static final String READY = "READY";

    private final PaperSafariGame game;
    private final List<Long> participants;
    private final Set<Long> readyVotes = new HashSet<>();

    public PaperSafariSession(List<Long> memberIds, RoundFactory factory) {
        this.participants = List.copyOf(memberIds);
        this.game = PaperSafariGame.start(memberIds.stream().map(PlayerId::new).toList(), factory);
    }

    @Override
    public List<GameOutcome> act(long memberId, GameAction action) {
        GameStatus before = game.status();
        apply(memberId, action);
        return outcomesSince(before);
    }

    @Override
    public List<GameOutcome> forfeit(long memberId) {
        GameStatus before = game.status();
        game.forfeit(new PlayerId(memberId));
        readyVotes.remove(memberId);
        startNextRoundIfAllReady();
        return outcomesSince(before);
    }

    @Override
    public Object viewFor(long memberId) {
        List<Long> ready = readyVotes.stream().sorted().toList();
        return new PaperSafariSessionView(game.viewFor(new PlayerId(memberId)), ready);
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

    private void apply(long memberId, GameAction action) {
        if (READY.equals(action.type())) {
            voteReady(memberId);
            return;
        }
        PaperSafariCommand.of(action.type()).apply(game, new PlayerId(memberId), action);
    }

    private void voteReady(long memberId) {
        if (game.status() != GameStatus.ROUND_OVER) {
            throw new BusinessException(ErrorCode.INVALID_PHASE);
        }
        if (!game.isSeated(new PlayerId(memberId))) {
            throw new BusinessException(ErrorCode.NOT_A_PLAYER);
        }
        readyVotes.add(memberId);
        startNextRoundIfAllReady();
    }

    private void startNextRoundIfAllReady() {
        if (game.status() != GameStatus.ROUND_OVER || !allSeatedReady()) {
            return;
        }
        readyVotes.clear();
        game.startNextRound();
    }

    private boolean allSeatedReady() {
        return participants.stream()
                .filter(memberId -> game.isSeated(new PlayerId(memberId)))
                .allMatch(readyVotes::contains);
    }

    private List<GameOutcome> outcomesSince(GameStatus before) {
        List<GameOutcome> outcomes = new ArrayList<>();
        roundCompletedSince(before).ifPresent(outcomes::add);
        gameCompletedSince(before).ifPresent(outcomes::add);
        return outcomes;
    }

    private Optional<GameOutcome> roundCompletedSince(GameStatus before) {
        if (before != GameStatus.IN_ROUND) {
            return Optional.empty();
        }
        return game.lastRoundResult().map(this::toRoundCompleted);
    }

    private Optional<GameOutcome> gameCompletedSince(GameStatus before) {
        if (before == GameStatus.GAME_OVER || !isFinished()) {
            return Optional.empty();
        }
        return Optional.of(toGameCompleted());
    }

    private RoundCompleted toRoundCompleted(RoundResult result) {
        List<RoundEntry> entries = result.players().stream()
                .map(player -> roundEntry(result, player))
                .toList();
        RoundNumber number = game.roundNumber();
        return new RoundCompleted(number.value(), entries);
    }

    private RoundEntry roundEntry(RoundResult result, PlayerId player) {
        ResultType type = ResultType.valueOf(result.outcomeOf(player).name());
        Score score = result.scoreOf(player);
        return new RoundEntry(player.value(), type, score.value());
    }

    private GameCompleted toGameCompleted() {
        PlayerId winner = game.winner().orElseThrow();
        List<MatchEntry> entries = IntStream.range(0, participants.size())
                .mapToObj(seat -> matchEntry(seat, winner))
                .toList();
        return new GameCompleted(entries);
    }

    private MatchEntry matchEntry(int seat, PlayerId winner) {
        PlayerId player = new PlayerId(participants.get(seat));
        ResultType result = player.equals(winner) ? ResultType.WIN : ResultType.LOSE;
        TokenCount tokens = game.tokensOf(player);
        return new MatchEntry(player.value(), result, tokens.value(), seat);
    }
}
