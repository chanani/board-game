package com.boardgame.papersafari.bot;

import com.boardgame.game.GameAction;
import java.util.Random;

// 난이도별 페이퍼 사파리 판단. 단계마다 하나씩.
interface SafariPlayer {

    GameAction flip(SafariSight sight, Random random);

    GameAction draw(SafariSight sight, Random random);

    GameAction place(SafariSight sight, Random random);

    GameAction peek(SafariSight sight, Random random);
}
