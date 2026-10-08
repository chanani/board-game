package com.boardgame.uno.bot;

import com.boardgame.game.GameType;
import com.boardgame.game.bot.BotBrain;
import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.game.bot.BotMind;
import org.springframework.stereotype.Component;

// 우노 컴퓨터 머리(R29~R32). 컴퓨터 한 명·한 판마다 새 판단을 만든다.
@Component
public class UnoBrain implements BotBrain {

    @Override
    public GameType type() {
        return GameType.UNO;
    }

    @Override
    public BotMind mind(BotDifficulty difficulty) {
        return new UnoMind(style(difficulty));
    }

    private static UnoStyle style(BotDifficulty difficulty) {
        return switch (difficulty) {
            case EASY -> new EasyUno();
            case MEDIUM -> new MediumUno();
            case HARD -> new HardUno();
        };
    }
}
