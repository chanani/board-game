package com.boardgame.game;

import java.util.List;

public interface GameSessionFactory {

    GameType type();

    GameSession create(List<Long> memberIds);
}
