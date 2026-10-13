package com.boardgame.fruitstack;

import com.boardgame.fruitstack.view.FruitStackSessionView;
import com.boardgame.game.GameAction;
import com.boardgame.game.GameCompleted;
import com.boardgame.game.GameOutcome;
import com.boardgame.game.GameSession;
import com.boardgame.game.MatchEntry;
import com.boardgame.game.RoundCompleted;
import com.boardgame.game.RoundEntry;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.OptionalLong;
import java.util.Random;
import java.util.stream.IntStream;

public class FruitStackSession implements GameSession {

    private static final int ROUND_NUMBER = 1;
    private static final int NO_TOKENS = 0;

    private final FruitStackGame game;

    public FruitStackSession(List<Long> memberIds, Seed seed, Clock clock) {
        List<PlayerId> players = memberIds.stream()
                .map(PlayerId::new)
                .toList();
        this.game = FruitStackGame.start(players, seed, clock);
    }

    @Override
    public List<GameOutcome> act(long memberId, GameAction action) {
        FruitStackCommand command = FruitStackCommand.of(action.type());
        command.apply(game, new PlayerId(memberId), action);
        return outcomesIfFinished();
    }

    // R24: 받아 주면 방의 모두에게 보낼 신호, 아니면 빈 값. 점수·상태·마감·기록은 바뀌지 않는다.
    @Override
    public Optional<Object> signal(long memberId, GameAction action) {
        FruitStackSignal signal = FruitStackSignal.of(action.type());
        OptionalLong seq = signal.apply(game, new PlayerId(memberId), action);
        if (seq.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(FruitStackViewAssembler.signal(game, memberId, seq.getAsLong(), action.board()));
    }

    // R29: 탈락한 사람(이미 게임 중이 아님)이 나가는 것은 기권이 아니다.
    @Override
    public List<GameOutcome> forfeit(long memberId) {
        PlayerId player = new PlayerId(memberId);
        if (!game.isPlaying(player)) {
            return List.of();
        }
        game.forfeit(player);
        return outcomesIfFinished();
    }

    // R17: 방의 타이머가 경기 상한에 부른다. 이른 호출이면 아무것도 하지 않는다.
    @Override
    public List<GameOutcome> autoAct(Random random) {
        if (!game.timeUp()) {
            return List.of();
        }
        return outcomesIfFinished();
    }

    @Override
    public Optional<Instant> deadline() {
        if (isFinished()) {
            return Optional.empty();
        }
        return Optional.of(game.limitAt());
    }

    @Override
    public Object viewFor(long memberId) {
        return new FruitStackSessionView(FruitStackViewAssembler.view(game, memberId));
    }

    @Override
    public boolean isFinished() {
        return game.isFinished();
    }

    @Override
    public boolean isPlaying(long memberId) {
        return game.isPlaying(new PlayerId(memberId));
    }

    @Override
    public int roundNumber() {
        return ROUND_NUMBER;
    }

    // 끝난 게임은 행동을 받지 않으므로, 행동 직후 끝나 있으면 이번 행동으로 끝난 것이다(결과는 딱 한 번).
    private List<GameOutcome> outcomesIfFinished() {
        return game.result()
                .map(this::outcomes)
                .orElse(List.of());
    }

    // R30: FORFEIT 끝은 경기만, 나머지는 라운드(겨루는 사람, 등수 순) + 경기(모두, 자리 순).
    private List<GameOutcome> outcomes(FruitStackResult result) {
        FruitStackEndReason reason = result.reason();
        GameCompleted match = gameCompleted(result.standings());
        if (!reason.recordsRound()) {
            return List.of(match);
        }
        return List.of(roundCompleted(result.standings()), match);
    }

    private RoundCompleted roundCompleted(Standings standings) {
        List<RoundEntry> entries = standings.contenders()
                .stream()
                .map(FruitStackSession::roundEntry)
                .toList();
        return new RoundCompleted(ROUND_NUMBER, entries);
    }

    private static RoundEntry roundEntry(Standing standing) {
        PlayerId player = standing.player();
        Score score = standing.score();
        return new RoundEntry(player.value(), standing.result(), score.value());
    }

    // 처음 참가자 모두(자리 순), tokens는 쓰지 않아 0, seat = 처음 memberIds 순서.
    private GameCompleted gameCompleted(Standings standings) {
        List<Standing> seats = standings.inSeatOrder();
        List<MatchEntry> entries = IntStream.range(0, seats.size())
                .mapToObj(seat -> matchEntry(seats.get(seat), seat))
                .toList();
        return new GameCompleted(entries);
    }

    private static MatchEntry matchEntry(Standing standing, int seat) {
        PlayerId player = standing.player();
        return new MatchEntry(player.value(), standing.result(), NO_TOKENS, seat);
    }
}
