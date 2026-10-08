package com.boardgame.game.bot;

import com.boardgame.game.GameType;

// 게임 종류마다 하나(@Component). 컴퓨터 한 명·한 판마다 새 BotMind를 만든다.
public interface BotBrain {

    GameType type();

    BotMind mind(BotDifficulty difficulty);
}
