package com.boardgame.record.application;

import com.boardgame.game.GameType;
import com.boardgame.game.MatchEntry;
import com.boardgame.game.RoundCompleted;
import com.boardgame.game.RoundEntry;
import com.boardgame.game.event.GameCompletedEvent;
import com.boardgame.game.event.GameStartedEvent;
import com.boardgame.game.event.RoundCompletedEvent;
import com.boardgame.record.domain.GameMatch;
import com.boardgame.record.domain.GameMatchRepository;
import com.boardgame.record.domain.MatchParticipant;
import com.boardgame.record.domain.MatchParticipantRepository;
import com.boardgame.record.domain.MatchRound;
import com.boardgame.record.domain.MatchRoundRepository;
import com.boardgame.record.domain.MemberGameStat;
import com.boardgame.record.domain.MemberGameStatId;
import com.boardgame.record.domain.MemberGameStatRepository;
import com.boardgame.record.domain.RoundParticipant;
import com.boardgame.record.domain.RoundParticipantRepository;
import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RecordService {

    private static final Logger log = LoggerFactory.getLogger(RecordService.class);

    private final GameMatchRepository matchRepository;
    private final MatchParticipantRepository participantRepository;
    private final MatchRoundRepository roundRepository;
    private final RoundParticipantRepository roundParticipantRepository;
    private final MemberGameStatRepository statRepository;
    private final Clock clock;

    public RecordService(GameMatchRepository matchRepository, MatchParticipantRepository participantRepository,
                         MatchRoundRepository roundRepository,
                         RoundParticipantRepository roundParticipantRepository,
                         MemberGameStatRepository statRepository, Clock clock) {
        this.matchRepository = matchRepository;
        this.participantRepository = participantRepository;
        this.roundRepository = roundRepository;
        this.roundParticipantRepository = roundParticipantRepository;
        this.statRepository = statRepository;
        this.clock = clock;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordStart(GameStartedEvent event) {
        if (matchRepository.findByMatchKey(event.matchKey()).isPresent()) {
            return;
        }
        GameMatch match = matchRepository.save(GameMatch.start(event.matchKey(), event.gameType(), event.startedAt()));
        joinAll(match, event.memberIds().stream().distinct().toList());
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordRound(RoundCompletedEvent event) {
        Optional<GameMatch> found = matchRepository.findByMatchKey(event.matchKey());
        if (found.isEmpty()) {
            log.warn("시작 기록이 없는 매치의 라운드를 무시합니다: {}", event.matchKey());
            return;
        }
        GameMatch match = found.get();
        RoundCompleted round = event.round();
        if (roundRepository.existsByMatchAndRoundNumber(match, round.roundNumber())) {
            return;
        }
        MatchRound saved = roundRepository.save(MatchRound.of(match, round.roundNumber(), clock.instant()));
        round.entries().forEach(entry -> recordRoundEntry(saved, entry, event.gameType()));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordCompletion(GameCompletedEvent event) {
        GameMatch match = matchRepository.findByMatchKey(event.matchKey())
                .orElseGet(() -> startFromCompletion(event));
        if (match.isFinished()) {
            return;
        }
        match.finish(event.endedAt());
        Map<Long, MatchParticipant> participants = participantRepository.findByMatch(match).stream()
                .collect(Collectors.toMap(MatchParticipant::memberId, Function.identity(), (first, second) -> first));
        event.result().entries().forEach(entry -> recordMatchEntry(participants, match, entry, event.gameType()));
    }

    private GameMatch startFromCompletion(GameCompletedEvent event) {
        GameMatch match = matchRepository.save(GameMatch.start(event.matchKey(), event.gameType(), event.startedAt()));
        event.result().entries().forEach(entry ->
                participantRepository.save(MatchParticipant.join(match, entry.memberId(), entry.seat())));
        return match;
    }

    private void joinAll(GameMatch match, List<Long> memberIds) {
        IntStream.range(0, memberIds.size())
                .forEach(seat -> participantRepository.save(MatchParticipant.join(match, memberIds.get(seat), seat)));
    }

    private void recordRoundEntry(MatchRound round, RoundEntry entry, GameType gameType) {
        roundParticipantRepository.save(RoundParticipant.of(round, entry.memberId(), entry.result(), entry.score()));
        statOf(entry.memberId(), gameType).recordRound(entry.result(), entry.score());
    }

    private void recordMatchEntry(Map<Long, MatchParticipant> participants, GameMatch match, MatchEntry entry,
                                  GameType gameType) {
        MatchParticipant participant = participants.computeIfAbsent(entry.memberId(),
                memberId -> participantRepository.save(MatchParticipant.join(match, memberId, entry.seat())));
        participant.finish(entry.result(), entry.tokens());
        statOf(entry.memberId(), gameType).recordMatch(entry.result());
    }

    private MemberGameStat statOf(long memberId, GameType gameType) {
        return statRepository.findById(new MemberGameStatId(memberId, gameType))
                .orElseGet(() -> statRepository.save(MemberGameStat.empty(memberId, gameType)));
    }
}
