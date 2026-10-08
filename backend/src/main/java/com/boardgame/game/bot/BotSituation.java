package com.boardgame.game.bot;

import com.boardgame.game.PendingKind;
import java.time.Instant;
import java.util.Random;

// 컴퓨터가 판단할 때 받는 것: 자기 자리 화면(R16, viewFor(botId)와 같은 객체), 결정 종류(R18), 지금 시각, 무작위.
public record BotSituation(Object view, PendingKind kind, Instant now, Random random) {
}
