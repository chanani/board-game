package com.boardgame.papersafari.bot;

import com.boardgame.game.GameType;
import com.boardgame.game.bot.BotBrain;
import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.game.bot.BotMind;
import org.springframework.stereotype.Component;

@Component
public class PaperSafariBrain implements BotBrain {

    @Override
    public GameType type() {
        return GameType.PAPER_SAFARI;
    }

    @Override
    public BotMind mind(BotDifficulty difficulty) {
        SeenCards seen = new SeenCards();
        return new PaperSafariMind(playerFor(difficulty, seen), seen);
    }

    private static SafariPlayer playerFor(BotDifficulty difficulty, SeenCards seen) {
        return switch (difficulty) {
            case EASY -> new EasySafari();
            case MEDIUM -> new MediumSafari();
            case HARD -> new HardSafari(seen);
        };
    }
}
