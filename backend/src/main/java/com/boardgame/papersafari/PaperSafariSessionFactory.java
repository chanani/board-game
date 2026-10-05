package com.boardgame.papersafari;

import com.boardgame.game.GameSession;
import com.boardgame.game.GameSessionFactory;
import com.boardgame.game.GameType;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class PaperSafariSessionFactory implements GameSessionFactory {

    @Override
    public GameType type() {
        return GameType.PAPER_SAFARI;
    }

    @Override
    public GameSession create(List<Long> memberIds) {
        return new PaperSafariSession(memberIds, RoundFactory.random());
    }
}
