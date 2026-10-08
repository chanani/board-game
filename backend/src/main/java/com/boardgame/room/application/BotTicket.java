package com.boardgame.room.application;

import com.boardgame.game.bot.BotPlan;
import com.boardgame.game.bot.BotStep;
import com.boardgame.room.domain.RoomCode;
import java.util.Optional;

// R20: 예약 당시의 방 상태 번호(epoch). 실행 때 번호가 최신일 때만 계획의 첫 걸음을 한다.
public record BotTicket(RoomCode code, long botId, long epoch, BotPlan plan) {

    public BotStep step() {
        return plan.first();
    }

    public Optional<BotTicket> next() {
        return plan.rest()
                .map(rest -> new BotTicket(code, botId, epoch, rest));
    }
}
