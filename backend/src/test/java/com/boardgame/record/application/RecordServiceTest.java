package com.boardgame.record.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import com.boardgame.game.GameCompleted;
import com.boardgame.game.GameType;
import com.boardgame.game.MatchEntry;
import com.boardgame.game.ResultType;
import com.boardgame.game.RoundCompleted;
import com.boardgame.game.RoundEntry;
import com.boardgame.game.event.GameCompletedEvent;
import com.boardgame.game.event.GameStartedEvent;
import com.boardgame.game.event.RoundCompletedEvent;
import com.boardgame.record.domain.GameMatch;
import com.boardgame.record.domain.GameMatchRepository;
import com.boardgame.record.domain.MatchParticipant;
import com.boardgame.record.domain.MatchParticipantRepository;
import com.boardgame.record.domain.MemberGameStat;
import com.boardgame.record.domain.MemberGameStatId;
import com.boardgame.record.domain.MemberGameStatRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class RecordServiceTest {

    private static final Instant STARTED = Instant.parse("2026-10-05T10:00:00Z");
    private static final Instant ENDED = Instant.parse("2026-10-05T10:30:00Z");

    @Autowired
    private ApplicationEventPublisher events;

    @Autowired
    private GameMatchRepository matchRepository;

    @Autowired
    private MatchParticipantRepository participantRepository;

    @Autowired
    private MemberGameStatRepository statRepository;

    private final long alice = ThreadLocalRandom.current().nextLong(1_000_000L, 1_000_000_000L);
    private final long bob = alice + 1;
    private final String matchKey = UUID.randomUUID().toString();

    private MemberGameStat statOf(long memberId) {
        return statRepository.findById(new MemberGameStatId(memberId, GameType.PAPER_SAFARI)).orElseThrow();
    }

    private void start() {
        events.publishEvent(new GameStartedEvent(matchKey, GameType.PAPER_SAFARI, List.of(alice, bob), STARTED));
    }

    private void round(int number, ResultType aliceResult, int aliceScore, ResultType bobResult, int bobScore) {
        events.publishEvent(new RoundCompletedEvent(matchKey, GameType.PAPER_SAFARI, new RoundCompleted(number,
                List.of(new RoundEntry(alice, aliceResult, aliceScore), new RoundEntry(bob, bobResult, bobScore)))));
    }

    private void complete() {
        events.publishEvent(new GameCompletedEvent(matchKey, GameType.PAPER_SAFARI, STARTED, ENDED, new GameCompleted(
                List.of(new MatchEntry(alice, ResultType.WIN, 3, 0), new MatchEntry(bob, ResultType.LOSE, 1, 1)))));
    }

    @Test
    void 시작하면_매치와_참가자가_결과_없이_저장된다() {
        start();

        GameMatch match = matchRepository.findByMatchKey(matchKey).orElseThrow();
        assertThat(match.gameType()).isEqualTo(GameType.PAPER_SAFARI);
        assertThat(match.startedAt()).isEqualTo(STARTED);
        assertThat(match.isFinished()).isFalse();
        assertThat(participantRepository.findByMatch(match))
                .extracting(MatchParticipant::memberId, MatchParticipant::seat, MatchParticipant::result)
                .containsExactlyInAnyOrder(
                        org.assertj.core.groups.Tuple.tuple(alice, 0, null),
                        org.assertj.core.groups.Tuple.tuple(bob, 1, null));
    }

    @Test
    void 라운드가_끝나면_라운드_통계가_오른다() {
        start();

        round(1, ResultType.WIN, 2, ResultType.LOSE, 30);
        round(2, ResultType.DRAW, 5, ResultType.DRAW, 5);

        assertThat(statOf(alice).rounds().counts().wins()).isEqualTo(1);
        assertThat(statOf(alice).rounds().counts().draws()).isEqualTo(1);
        assertThat(statOf(alice).rounds().scoreSum()).isEqualTo(7);
        assertThat(statOf(bob).rounds().counts().losses()).isEqualTo(1);
        assertThat(statOf(bob).matches().total()).isZero();
    }

    @Test
    void 게임이_끝나면_참가자_결과와_판_통계가_기록된다() {
        start();
        round(1, ResultType.WIN, 2, ResultType.LOSE, 30);

        complete();

        GameMatch match = matchRepository.findByMatchKey(matchKey).orElseThrow();
        assertThat(match.endedAt()).isEqualTo(ENDED);
        assertThat(participantRepository.findByMatch(match))
                .extracting(MatchParticipant::memberId, MatchParticipant::result, MatchParticipant::tokens)
                .containsExactlyInAnyOrder(
                        org.assertj.core.groups.Tuple.tuple(alice, ResultType.WIN, 3),
                        org.assertj.core.groups.Tuple.tuple(bob, ResultType.LOSE, 1));
        assertThat(statOf(alice).matches().wins()).isEqualTo(1);
        assertThat(statOf(bob).matches().losses()).isEqualTo(1);
    }

    @Test
    void 같은_이벤트가_두_번_와도_한_번만_기록된다() {
        start();
        start();
        round(1, ResultType.WIN, 2, ResultType.LOSE, 30);
        round(1, ResultType.WIN, 2, ResultType.LOSE, 30);
        complete();
        complete();

        GameMatch match = matchRepository.findByMatchKey(matchKey).orElseThrow();
        assertThat(participantRepository.findByMatch(match)).hasSize(2);
        assertThat(statOf(alice).rounds().counts().total()).isEqualTo(1);
        assertThat(statOf(alice).matches().total()).isEqualTo(1);
    }

    @Test
    void 시작_기록_없이_끝나도_매치를_만들어_기록한다() {
        complete();

        GameMatch match = matchRepository.findByMatchKey(matchKey).orElseThrow();
        assertThat(match.isFinished()).isTrue();
        assertThat(match.startedAt()).isEqualTo(STARTED);
        assertThat(participantRepository.findByMatch(match)).hasSize(2);
        assertThat(statOf(bob).matches().losses()).isEqualTo(1);
    }

    @Test
    void 모르는_매치의_라운드는_예외_없이_무시된다() {
        assertThatCode(() -> round(1, ResultType.WIN, 2, ResultType.LOSE, 30)).doesNotThrowAnyException();

        assertThat(matchRepository.findByMatchKey(matchKey)).isEmpty();
        assertThat(statRepository.findById(new MemberGameStatId(alice, GameType.PAPER_SAFARI))).isEmpty();
    }
}
