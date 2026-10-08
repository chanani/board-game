package com.boardgame.oldmaid.bot;

import com.boardgame.game.GameType;
import com.boardgame.game.bot.BotBrain;
import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.game.bot.BotMind;
import org.springframework.stereotype.Component;

@Component
public class OldMaidBrain implements BotBrain {

    @Override
    public GameType type() {
        return GameType.OLD_MAID;
    }

    @Override
    public BotMind mind(BotDifficulty difficulty) {
        return new OldMaidMind(playerOf(difficulty));
    }

    private static OldMaidPlayer playerOf(BotDifficulty difficulty) {
        return switch (difficulty) {
            case EASY -> new EasyOldMaid();
            case MEDIUM -> new MediumOldMaid();
            case HARD -> new HardOldMaid();
        };
    }
}
