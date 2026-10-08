package com.boardgame.papersafari.bot;

import com.boardgame.game.GameAction;
import java.util.Random;

// R24·R25: 하 — 기존 자동 행동 그대로(버린 더미가 있으면 가져오고 없으면 덱, 무작위 칸, 무작위 엿보기),
// 단 덱에서 뽑은 카드는 30% 확률로 그냥 버린다.
final class EasySafari implements SafariPlayer {

    private static final int DISCARD_PERCENT = 30;

    @Override
    public GameAction flip(SafariSight sight, Random random) {
        return SafariAuto.flip(sight, random);
    }

    @Override
    public GameAction draw(SafariSight sight, Random random) {
        return SafariAuto.draw(sight);
    }

    @Override
    public GameAction place(SafariSight sight, Random random) {
        if (SafariMoves.canDiscard(sight) && random.nextInt(100) < DISCARD_PERCENT) {
            return SafariMoves.discard();
        }
        return SafariAuto.place(sight, random);
    }

    @Override
    public GameAction peek(SafariSight sight, Random random) {
        return SafariAuto.peek(sight, random);
    }
}
