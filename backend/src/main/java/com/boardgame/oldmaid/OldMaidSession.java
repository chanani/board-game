package com.boardgame.oldmaid;

import com.boardgame.game.GameAction;
import com.boardgame.game.GameCompleted;
import com.boardgame.game.GameOutcome;
import com.boardgame.game.GameSession;
import com.boardgame.game.MatchEntry;
import com.boardgame.game.PendingActor;
import com.boardgame.game.ResultType;
import com.boardgame.game.RoundCompleted;
import com.boardgame.game.RoundEntry;
import com.boardgame.oldmaid.view.OldMaidSessionView;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import java.util.stream.IntStream;

public class OldMaidSession implements GameSession {

    private static final int ROUND_NUMBER = 1;

    private final OldMaidGame game;
    private final OldMaidMatch match;
    private final OldMaidTimer timer;

    public OldMaidSession(List<Long> memberIds, OldMaidRoundFactory factory, Clock clock) {
        this(memberIds, OldMaidGame.start(playerIds(memberIds), factory), clock);
    }

    OldMaidSession(List<Long> memberIds, OldMaidGame game, Clock clock) {
        this.game = game;
        this.match = new OldMaidMatch(playerIds(memberIds), clock.instant());
        this.timer = new OldMaidTimer(clock, game.step());
    }

    private static List<PlayerId> playerIds(List<Long> memberIds) {
        return memberIds.stream()
                .map(PlayerId::new)
                .toList();
    }

    @Override
    public List<GameOutcome> act(long memberId, GameAction action) {
        OldMaidCommand command = OldMaidCommand.of(action.type());
        command.apply(game, new PlayerId(memberId), action, timer.now());
        timer.humanActed(game.step());
        return outcomesIfFinished();
    }

    // R17~R20: 받아 주면 방의 모두에게 보낼 신호, 아니면 빈 값. 상태·마감·기록은 바뀌지 않는다.
    @Override
    public Optional<Object> signal(long memberId, GameAction action) {
        OldMaidSignal signal = OldMaidSignal.of(action.type());
        if (!signal.apply(game, new PlayerId(memberId), action, timer.now())) {
            return Optional.empty();
        }
        return Optional.of(OldMaidViewAssembler.signal(game, match));
    }

    // R28: 이미 끝낸 사람(카드 없음)이 나가는 것은 기권이 아니다. 게임에 손대지 않고 빈 결과.
    @Override
    public List<GameOutcome> forfeit(long memberId) {
        PlayerId player = new PlayerId(memberId);
        if (!game.holds(player)) {
            return List.of();
        }
        game.forfeit(player);
        timer.follow(game.step());
        return outcomesIfFinished();
    }

    // R35·R38
    @Override
    public List<GameOutcome> autoAct(Random random) {
        List<PlayerId> actors = game.autoAct(random);
        timer.autoActed(actors, game.step());
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
        OldMaidViewContext context = new OldMaidViewContext(match, timer.timing(!isFinished()), timer.autoActors());
        return new OldMaidSessionView(game.viewFor(new PlayerId(memberId), context));
    }

    @Override
    public boolean isFinished() {
        return game.isFinished();
    }

    // R28: 카드를 가진 사람만 게임 중이다(끝낸 사람은 나가도 기권이 아니다).
    @Override
    public boolean isPlaying(long memberId) {
        return !isFinished() && game.holds(new PlayerId(memberId));
    }

    @Override
    public int roundNumber() {
        return ROUND_NUMBER;
    }

    @Override
    public List<PendingActor> pendingActors() {
        return game.pendingActors();
    }

    // 끝난 게임은 행동을 받지 않으므로, 행동 직후 끝나 있으면 이번 행동으로 끝난 것이다(결과는 딱 한 번).
    private List<GameOutcome> outcomesIfFinished() {
        if (!isFinished()) {
            return List.of();
        }
        Ranking ranking = game.result().orElseThrow().ranking();
        return List.of(roundCompleted(ranking), gameCompleted(ranking));
    }

    // R32: 등수 순, score = 등수.
    private RoundCompleted roundCompleted(Ranking ranking) {
        List<RoundEntry> entries = ranking.entries()
                .stream()
                .map(entry -> new RoundEntry(entry.player().value(), resultOf(entry), entry.rank().value()))
                .toList();
        return new RoundCompleted(ROUND_NUMBER, entries);
    }

    // R32: 처음 참가자 모두(자리 순), tokens = 등수, seat = 처음 memberIds 순서.
    private GameCompleted gameCompleted(Ranking ranking) {
        List<PlayerId> participants = match.participants();
        List<MatchEntry> entries = IntStream.range(0, participants.size())
                .mapToObj(seat -> matchEntry(ranking.of(participants.get(seat)), seat))
                .toList();
        return new GameCompleted(entries);
    }

    private static MatchEntry matchEntry(RankedPlayer entry, int seat) {
        return new MatchEntry(entry.player().value(), resultOf(entry), entry.rank().value(), seat);
    }

    private static ResultType resultOf(RankedPlayer entry) {
        if (entry.isWinner()) {
            return ResultType.WIN;
        }
        return ResultType.LOSE;
    }
}
