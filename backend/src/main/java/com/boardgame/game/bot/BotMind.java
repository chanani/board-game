package com.boardgame.game.bot;

import com.boardgame.game.GameAction;
import java.util.Optional;
import java.util.Random;

// 컴퓨터 한 명의 한 게임 동안의 판단(기억 포함). 입력은 늘 그 컴퓨터 자리 화면뿐이다(R16).
// 게임마다 새로 만들어진다(지난 게임의 기억을 이어 쓰지 않는다).
// observe·plan·fallback은 방 잠금 안에서 사람의 요청 스레드로 불리므로 가볍게(밀리초 단위) 끝내야 한다. 무거운 탐색을 하지 않는다.
// 예외를 내도 구동기가 기록하고 삼키지만(R21), 그 컴퓨터는 이번 결정을 하지 못한다.
public interface BotMind {

    /** 상태가 바뀔 때마다 자기 자리 화면을 본다. 기억이 필요한 난이도만 쓴다. */
    default void observe(Object view) {
    }

    /** 지금 할 일. 하지 않기로 하면 빈 값(차례 밖 행동). */
    Optional<BotPlan> plan(BotSituation situation);

    /** R21: 판단이 실패했을 때 쓰는 기존 자동 행동(autoAct)과 같은 결정. 자기 차례가 아니면 빈 값. */
    Optional<GameAction> fallback(Object view, Random random);
}
