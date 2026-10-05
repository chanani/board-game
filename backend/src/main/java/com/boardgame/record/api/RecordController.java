package com.boardgame.record.api;

import com.boardgame.common.security.LoginMember;
import com.boardgame.game.GameType;
import com.boardgame.record.application.RecordQueryService;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/records")
public class RecordController {

    private final RecordQueryService queryService;

    public RecordController(RecordQueryService queryService) {
        this.queryService = queryService;
    }

    @GetMapping("/me")
    public MemberStatsResponse me(@AuthenticationPrincipal LoginMember member) {
        return queryService.memberStats(member.id());
    }

    @GetMapping("/members/{memberId}")
    public MemberStatsResponse member(@PathVariable long memberId) {
        return queryService.memberStats(memberId);
    }

    @GetMapping("/members/{memberId}/matches")
    public List<RecentMatchResponse> recentMatches(@PathVariable long memberId,
                                                   @RequestParam(required = false) GameType gameType,
                                                   @RequestParam(defaultValue = "10") int limit) {
        return queryService.recentMatches(memberId, gameType, limit);
    }

    @GetMapping("/rankings")
    public List<RankingResponse> rankings(@RequestParam GameType gameType) {
        return queryService.rankings(gameType);
    }
}
