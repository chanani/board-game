package com.boardgame.game.bot;

import com.boardgame.game.GameType;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Component;

// 게임 종류별 머리 모음. 머리가 없는 게임의 컴퓨터는 움직이지 않는다(시간 초과 처리만 받는다).
// 생성자가 하나라 등록된 BotBrain이 없으면 스프링이 빈 목록을 넣는다(GameSessionFactories와 같은 방식).
@Component
public class BotBrains {

    private final Map<GameType, BotBrain> brains = new EnumMap<>(GameType.class);

    public BotBrains(List<BotBrain> brains) {
        brains.forEach(brain -> this.brains.put(brain.type(), brain));
    }

    public Optional<BotMind> mind(GameType type, BotDifficulty difficulty) {
        return Optional.ofNullable(brains.get(type))
                .map(brain -> brain.mind(difficulty));
    }
}
