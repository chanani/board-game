package com.boardgame.record.application;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.game.GameType;
import com.boardgame.member.domain.Member;
import com.boardgame.member.domain.MemberRepository;
import com.boardgame.record.api.GameStatResponse;
import com.boardgame.record.api.MatchPlayerResponse;
import com.boardgame.record.api.MemberStatsResponse;
import com.boardgame.record.api.RankingResponse;
import com.boardgame.record.api.RecentMatchResponse;
import com.boardgame.record.api.RoundResultResponse;
import com.boardgame.record.domain.GameMatch;
import com.boardgame.record.domain.MatchParticipant;
import com.boardgame.record.domain.MatchParticipantRepository;
import com.boardgame.record.domain.MemberGameStat;
import com.boardgame.record.domain.MemberGameStatRepository;
import com.boardgame.record.domain.ResultCounts;
import com.boardgame.record.domain.RoundParticipant;
import com.boardgame.record.domain.RoundParticipantRepository;
import java.util.Arrays;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class RecordQueryService {

    private static final int MIN_LIMIT = 1;
    private static final int MAX_LIMIT = 50;
    private static final String UNKNOWN_NICKNAME = "알 수 없음";

    private final MemberRepository memberRepository;
    private final MemberGameStatRepository statRepository;
    private final MatchParticipantRepository participantRepository;
    private final RoundParticipantRepository roundParticipantRepository;

    public RecordQueryService(MemberRepository memberRepository, MemberGameStatRepository statRepository,
                              MatchParticipantRepository participantRepository,
                              RoundParticipantRepository roundParticipantRepository) {
        this.memberRepository = memberRepository;
        this.statRepository = statRepository;
        this.participantRepository = participantRepository;
        this.roundParticipantRepository = roundParticipantRepository;
    }

    public MemberStatsResponse memberStats(long memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new BusinessException(ErrorCode.MEMBER_NOT_FOUND));
        Map<GameType, MemberGameStat> stats = statRepository.findByIdMemberId(memberId).stream()
                .collect(Collectors.toMap(MemberGameStat::gameType, Function.identity()));
        List<GameStatResponse> responses = Arrays.stream(GameType.values())
                .map(type -> GameStatResponse.from(stats.getOrDefault(type, MemberGameStat.empty(memberId, type))))
                .toList();
        return new MemberStatsResponse(memberId, member.nicknameValue(), responses);
    }

    public List<RecentMatchResponse> recentMatches(long memberId, GameType gameType, int limit) {
        int size = Math.clamp(limit, MIN_LIMIT, MAX_LIMIT);
        List<MatchParticipant> mine = participantRepository.findFinishedByMember(memberId, gameType,
                PageRequest.of(0, size));
        if (mine.isEmpty()) {
            return List.of();
        }
        List<GameMatch> matches = mine.stream().map(MatchParticipant::match).toList();
        Map<Long, List<MatchParticipant>> players = participantRepository.findByMatchInOrderBySeatSeatAsc(matches)
                .stream()
                .collect(Collectors.groupingBy(participant -> participant.match().id()));
        Map<Long, List<RoundParticipant>> rounds = roundParticipantRepository.findByMemberAndMatches(memberId, matches)
                .stream()
                .collect(Collectors.groupingBy(round -> round.round().match().id()));
        Map<Long, String> nicknames = nicknames(players.values().stream().flatMap(List::stream)
                .map(MatchParticipant::memberId).collect(Collectors.toSet()));
        return mine.stream()
                .map(participant -> recentMatch(participant, players, rounds, nicknames))
                .toList();
    }

    public List<RankingResponse> rankings(GameType gameType) {
        List<MemberGameStat> ranked = statRepository.findByIdGameType(gameType).stream()
                .filter(MemberGameStat::isRanked)
                .sorted(Comparator.comparing((MemberGameStat stat) -> stat.matches().winRate()).reversed()
                        .thenComparing(stat -> stat.matches().total(), Comparator.reverseOrder())
                        .thenComparing(MemberGameStat::memberId))
                .toList();
        Map<Long, String> nicknames = nicknames(ranked.stream().map(MemberGameStat::memberId).toList());
        return IntStream.range(0, ranked.size())
                .mapToObj(index -> ranking(index + 1, ranked.get(index), nicknames))
                .toList();
    }

    private RecentMatchResponse recentMatch(MatchParticipant mine, Map<Long, List<MatchParticipant>> players,
                                            Map<Long, List<RoundParticipant>> rounds, Map<Long, String> nicknames) {
        GameMatch match = mine.match();
        List<MatchPlayerResponse> playerResponses = players.getOrDefault(match.id(), List.of()).stream()
                .map(player -> new MatchPlayerResponse(player.memberId(), nicknameOf(nicknames, player.memberId()),
                        player.result(), player.tokens()))
                .toList();
        List<RoundResultResponse> roundResponses = rounds.getOrDefault(match.id(), List.of()).stream()
                .map(round -> new RoundResultResponse(round.round().roundNumber(), round.result(), round.score()))
                .toList();
        return new RecentMatchResponse(match.id(), match.gameType(), match.startedAt(), match.endedAt(),
                mine.result(), mine.tokens(), playerResponses, roundResponses);
    }

    private RankingResponse ranking(int rank, MemberGameStat stat, Map<Long, String> nicknames) {
        ResultCounts matches = stat.matches();
        return new RankingResponse(rank, stat.memberId(), nicknameOf(nicknames, stat.memberId()), matches.total(),
                matches.wins(), matches.draws(), matches.losses(), matches.winRate());
    }

    private Map<Long, String> nicknames(Collection<Long> memberIds) {
        return memberRepository.findAllById(memberIds).stream()
                .collect(Collectors.toMap(Member::id, Member::nicknameValue));
    }

    private String nicknameOf(Map<Long, String> nicknames, long memberId) {
        return nicknames.getOrDefault(memberId, UNKNOWN_NICKNAME);
    }
}
