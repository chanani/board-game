package com.boardgame.record.api;

import java.util.List;

public record MemberStatsResponse(long memberId, String nickname, String avatar, List<GameStatResponse> stats) {
}
