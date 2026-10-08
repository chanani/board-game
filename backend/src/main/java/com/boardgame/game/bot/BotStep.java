package com.boardgame.game.bot;

import com.boardgame.game.GameAction;
import java.time.Duration;

// 컴퓨터 계획의 한 걸음: 앞 걸음(첫 걸음은 지금)으로부터 delay 뒤에 action을 보낸다.
public record BotStep(Duration delay, BotStepKind kind, GameAction action) {

    public static BotStep act(Duration delay, GameAction action) {
        return new BotStep(delay, BotStepKind.ACT, action);
    }

    public static BotStep signal(Duration delay, GameAction action) {
        return new BotStep(delay, BotStepKind.SIGNAL, action);
    }

    public boolean isSignal() {
        return kind == BotStepKind.SIGNAL;
    }
}
