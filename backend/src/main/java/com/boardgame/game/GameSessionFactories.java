package com.boardgame.game;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class GameSessionFactories {

    private final Map<GameType, GameSessionFactory> factories = new EnumMap<>(GameType.class);

    public GameSessionFactories(List<GameSessionFactory> factories) {
        factories.forEach(factory -> this.factories.put(factory.type(), factory));
    }

    public GameSession create(GameType type, List<Long> memberIds) {
        GameSessionFactory factory = factories.get(type);
        if (factory == null) {
            throw new IllegalStateException("등록되지 않은 게임입니다: " + type);
        }
        return factory.create(memberIds);
    }
}
