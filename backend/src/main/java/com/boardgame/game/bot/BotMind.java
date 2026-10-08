package com.boardgame.game.bot;

import com.boardgame.game.GameAction;
import java.util.Optional;
import java.util.Random;

// 컴퓨터 한 명의 한 게임 동안의 판단(기억 포함). 입력은 늘 그 컴퓨터 자리 화면뿐이다(R16).
public interface BotMind {

    /** 상태가 바뀔 때마다 자기 자리 화면을 본다. 기억이 필요한 난이도만 쓴다. */
    default void observe(Object view) {
    }

    /** 지금 할 일. 하지 않기로 하면 빈 값(차례 밖 행동). */
    Optional<BotPlan> plan(BotSituation situation);

    /** R21: 판단이 실패했을 때 쓰는 기존 자동 행동(autoAct)과 같은 결정. 자기 차례가 아니면 빈 값. */
    Optional<GameAction> fallback(Object view, Random random);
}
