package com.boardgame.game.bot;

import com.boardgame.game.PendingKind;
import java.time.Duration;
import java.time.Instant;
import java.util.Random;

// 컴퓨터가 판단할 때 받는 것: 자기 자리 화면(R16, viewFor(botId)와 같은 객체), 결정 종류(R18), 지금 시각, 무작위.
// pace는 app.bots.pace(예약 지연에 곱하는 배율). 계획이 돌려주는 지연은 배율 전 값이고 구동기가 곱해 예약하므로,
// 실제 시각(쿨다운·창 마감)과 맞춰야 하는 뇌는 real/planned로 오간다.
public record BotSituation(Object view, PendingKind kind, Instant now, Random random, double pace) {

    public BotSituation(Object view, PendingKind kind, Instant now, Random random) {
        this(view, kind, now, random, 1.0);
    }

    /** 계획에서 쓰는 지연을 실제로 걸릴 시간으로. */
    public Duration real(Duration planned) {
        return Duration.ofMillis(Math.round(planned.toMillis() * pace));
    }

    /** 실제로 남은 시간을 구동기가 곱하기 전 계획 지연으로. */
    public Duration planned(Duration real) {
        if (pace <= 0) {
            return Duration.ZERO;
        }
        return Duration.ofMillis(Math.round(real.toMillis() / pace));
    }
}
